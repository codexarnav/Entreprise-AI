import asyncio
import logging
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.auth import router as auth_router
from src.database import close_db, connect_db, get_db
from src.executive_layer import PromptInput, distil_results_for_ctx, orchestrate
from src.utils import decode_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=4)

# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(title="Enterprise AI Backend", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _doc(d: dict) -> dict:
    if not d:
        return {}
    d = dict(d)
    if "_id" in d:
        d["id"] = str(d.pop("_id"))
    return d


def _docs(lst: list) -> list:
    return [_doc(d) for d in lst]


async def get_current_user(authorization: str = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(401, "Authorization header missing")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer":
        raise HTTPException(401, "Invalid auth scheme — use Bearer")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    return payload


# ── Background runner ─────────────────────────────────────────────────────────

async def run_workflow(
    workflow_id: str,
    prompt: str,
    session_id: Optional[str],
    user: dict,
    extra_results: Optional[Dict[str, Any]] = None,
    file_path: Optional[str] = None,
    url: Optional[str] = None,
) -> None:
    db = get_db()
    try:
        # 1. Load prior session context from Mongo
        prior_context: Optional[Dict] = None
        if session_id:
            session = await db["sessions"].find_one({"_id": session_id})
            if session and session.get("context"):
                turns = session["context"]
                last = turns[-1]
                prior_context = {
                    "last_workflow": last.get("workflow", ""),
                    "last_intent":   last.get("intent", ""),
                    "results":       last.get("results_summary", {}),
                    "history": [
                        {"prompt": t.get("prompt"), "workflow": t.get("workflow", "")}
                        for t in turns[:-1]
                    ],
                }

        # 2. Merge HIL-resolution data into prior_context.results
        if extra_results:
            if prior_context:
                prior_context["results"] = {**prior_context.get("results", {}), **extra_results}
            else:
                prior_context = {"results": extra_results, "last_workflow": "", "last_intent": "", "history": []}

        # 3. Fetch email config from user profile (injected at login)
        email_config = None
        user_doc = await db["users"].find_one({"_id": user.get("sub")})
        if user_doc and user_doc.get("email_config"):
            email_config = user_doc["email_config"]

        prompt_input = PromptInput(
            prompt=prompt,
            session_id=session_id,
            user_id=user.get("sub"),
            prior_context=prior_context,
            email_config=email_config,
            file_path=file_path,
            url=url,
        )

        # 4. Run synchronous orchestrate() in thread pool
        loop = asyncio.get_running_loop()
        output = await loop.run_in_executor(_executor, orchestrate, prompt_input)

        status_map = {
            "success":         "completed",
            "partial_success": "partial_success",
            "awaiting_hil":    "awaiting_hil",
            "failed":          "failed",
        }
        final_status = status_map.get(output.status, "failed")
        now = datetime.utcnow()

        # 5. Update workflow document — include perception/goal extracted during orchestration
        # output.results may contain a "_meta" key with perception + goal if the
        # orchestrator stored it; otherwise store what we have.
        await db["workflows"].update_one(
            {"_id": workflow_id},
            {"$set": {
                "status":          final_status,
                "results":         output.results,
                "current_step":    len(output.tasks_executed),
                "hil_status":      output.hil_status.dict() if output.hil_status else None,
                "workflow_type":   output.workflow_type,
                "orchestrator_id": output.workflow_id,   # inner UUID from orchestrate()
                "success_metrics": output.success_metrics,
                "updated_at":      now,
            }},
        )

        # 6. Insert completed task records
        for i, tid in enumerate(output.tasks_executed):
            await db["tasks"].insert_one({
                "_id":          str(uuid.uuid4()),
                "workflow_id":  workflow_id,
                "task_name":    tid,
                "step":         i,
                "status":       "completed",
                "output":       output.results.get(tid, {}),
                "started_at":   now,
                "completed_at": now,
            })

        # 7. Insert failed task records
        for tid, err in output.errors.items():
            await db["tasks"].insert_one({
                "_id":          str(uuid.uuid4()),
                "workflow_id":  workflow_id,
                "task_name":    tid,
                "step":         9999,
                "status":       "failed",
                "output":       {"error": err},
                "started_at":   now,
                "completed_at": now,
            })

        # 8. Write audit log
        await db["audit_logs"].insert_one({
            "_id":         str(uuid.uuid4()),
            "workflow_id": workflow_id,
            "event":       f"workflow_{final_status}",
            "details": {
                "completed": len(output.tasks_executed),
                "failed":    len(output.errors),
                "hil":       bool(output.hil_status and output.hil_status.required),
            },
            "timestamp": now,
        })

        # 9. Persist session turn (skip if failed)
        if session_id and final_status != "failed":
            turn = {
                "prompt":          prompt,
                "workflow":        output.workflow_type,
                "intent":          output.workflow_type,   # best proxy without perception obj
                "results_summary": distil_results_for_ctx(output.results),
                "status":          final_status,
                "workflow_id":     workflow_id,
                "timestamp":       now.isoformat(),
            }
            await db["sessions"].update_one(
                {"_id": session_id},
                {
                    "$push": {"context": {"$each": [turn], "$slice": -4}},
                    "$set":  {"last_workflow_id": workflow_id, "updated_at": now},
                },
            )

        logger.info(f"✓ Workflow {workflow_id} → {final_status}")

    except Exception as exc:
        logger.exception(f"✗ Workflow {workflow_id} crashed: {exc}")
        now = datetime.utcnow()
        await db["workflows"].update_one(
            {"_id": workflow_id},
            {"$set": {"status": "failed", "error": str(exc), "updated_at": now}},
        )
        await db["audit_logs"].insert_one({
            "_id":         str(uuid.uuid4()),
            "workflow_id": workflow_id,
            "event":       "workflow_failed",
            "details":     {"error": str(exc)},
            "timestamp":   now,
        })


# ── Request schemas ───────────────────────────────────────────────────────────

class ExecuteReq(BaseModel):
    prompt: str
    session_id: Optional[str] = None
    file_path: Optional[str] = None
    url: Optional[str] = None


class ResumeReq(BaseModel):
    inputs: Dict[str, Any]   # HIL-required fields, e.g. aadhar_number, pan_number


class ApproveReq(BaseModel):
    approval: str            # "approve" | "reject"
    notes: Optional[str] = None


# ── Execution endpoints ───────────────────────────────────────────────────────

@app.post("/execute", tags=["Execution"])
async def execute(
    req: ExecuteReq,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    workflow_id = str(uuid.uuid4())
    session_id = req.session_id or user.get("session_id")
    now = datetime.utcnow()

    await db["workflows"].insert_one({
        "_id":          workflow_id,
        "prompt":       req.prompt,
        "session_id":   session_id,
        "user_id":      user.get("sub"),
        "status":       "running",
        "current_step": 0,
        "results":      {},
        "hil_status":   None,
        "created_at":   now,
        "updated_at":   now,
    })

    await db["audit_logs"].insert_one({
        "_id":         str(uuid.uuid4()),
        "workflow_id": workflow_id,
        "event":       "workflow_created",
        "details":     {"prompt": req.prompt, "user": user.get("sub")},
        "timestamp":   now,
    })

    background_tasks.add_task(
        run_workflow, workflow_id, req.prompt, session_id, user,
        None, req.file_path, req.url,
    )
    return {"workflow_id": workflow_id, "status": "started"}


@app.get("/workflow/{workflow_id}", tags=["Execution"])
async def get_workflow(workflow_id: str, user: dict = Depends(get_current_user)):
    doc = await get_db()["workflows"].find_one({"_id": workflow_id})
    if not doc:
        raise HTTPException(404, "Workflow not found")
    return _doc(doc)


@app.get("/workflow/{workflow_id}/tasks", tags=["Execution"])
async def get_workflow_tasks(workflow_id: str, user: dict = Depends(get_current_user)):
    cur = get_db()["tasks"].find({"workflow_id": workflow_id}).sort("step", 1)
    return _docs(await cur.to_list(500))


@app.get("/workflow/{workflow_id}/audit", tags=["Execution"])
async def get_workflow_audit(workflow_id: str, user: dict = Depends(get_current_user)):
    cur = get_db()["audit_logs"].find({"workflow_id": workflow_id}).sort("timestamp", 1)
    return _docs(await cur.to_list(1000))


# ── HIL endpoints ─────────────────────────────────────────────────────────────

@app.post("/workflow/{workflow_id}/resume", tags=["HIL"])
async def resume_workflow(
    workflow_id: str,
    req: ResumeReq,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    workflow = await db["workflows"].find_one({"_id": workflow_id})
    if not workflow:
        raise HTTPException(404, "Workflow not found")
    if workflow.get("status") != "awaiting_hil":
        raise HTTPException(400, "Workflow is not awaiting HIL")

    # Map human-facing field names to state.results keys the HIL gates check
    extra: Dict[str, Any] = {}
    if "aadhar_number" in req.inputs:
        extra["vendor_aadhar"] = req.inputs["aadhar_number"]
    if "pan_number" in req.inputs:
        extra["vendor_pan"] = req.inputs["pan_number"]
    extra.update(req.inputs)

    now = datetime.utcnow()
    await db["workflows"].update_one(
        {"_id": workflow_id},
        {"$set": {"status": "running", "hil_status": None, "updated_at": now}},
    )
    await db["audit_logs"].insert_one({
        "_id": str(uuid.uuid4()), "workflow_id": workflow_id,
        "event": "hil_resumed", "details": {"inputs_provided": list(req.inputs.keys())},
        "timestamp": now,
    })
    background_tasks.add_task(
        run_workflow, workflow_id, workflow["prompt"],
        workflow.get("session_id"), user, extra,
    )
    return {"workflow_id": workflow_id, "status": "resuming"}


@app.post("/workflow/{workflow_id}/approve", tags=["HIL"])
async def approve_workflow(
    workflow_id: str,
    req: ApproveReq,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
):
    db = get_db()
    workflow = await db["workflows"].find_one({"_id": workflow_id})
    if not workflow:
        raise HTTPException(404, "Workflow not found")

    now = datetime.utcnow()

    if req.approval == "reject":
        await db["workflows"].update_one(
            {"_id": workflow_id},
            {"$set": {"status": "rejected", "updated_at": now}},
        )
        await db["audit_logs"].insert_one({
            "_id": str(uuid.uuid4()), "workflow_id": workflow_id,
            "event": "hil_rejected", "details": {"notes": req.notes, "by": user.get("sub")},
            "timestamp": now,
        })
        return {"workflow_id": workflow_id, "status": "rejected"}

    # approve: clear the requires_escalation flag so Gate 2 passes on re-run
    existing_risk = workflow.get("results", {}).get("vendor_risk", {})
    extra = {
        "vendor_risk": {
            **existing_risk,
            "requires_escalation": False,
            "approved_by": user.get("sub"),
            "approval_notes": req.notes or "",
        }
    }
    await db["workflows"].update_one(
        {"_id": workflow_id},
        {"$set": {"status": "running", "hil_status": None, "updated_at": now}},
    )
    await db["audit_logs"].insert_one({
        "_id": str(uuid.uuid4()), "workflow_id": workflow_id,
        "event": "hil_approved", "details": {"by": user.get("sub"), "notes": req.notes},
        "timestamp": now,
    })
    background_tasks.add_task(
        run_workflow, workflow_id, workflow["prompt"],
        workflow.get("session_id"), user, extra,
    )
    return {"workflow_id": workflow_id, "status": "resuming"}


# ── Session endpoint ──────────────────────────────────────────────────────────

@app.get("/session/{session_id}", tags=["Session"])
async def get_session(session_id: str, user: dict = Depends(get_current_user)):
    doc = await get_db()["sessions"].find_one({"_id": session_id})
    if not doc:
        raise HTTPException(404, "Session not found")
    if doc.get("user_id") != user.get("sub"):
        raise HTTPException(403, "Forbidden")
    return _doc(doc)


# ── Domain endpoints ──────────────────────────────────────────────────────────

@app.get("/rfps", tags=["Domain"])
async def list_rfps(user: dict = Depends(get_current_user)):
    cur = get_db()["rfps"].find({}).sort("created_at", -1).limit(100)
    return _docs(await cur.to_list(100))


@app.get("/rfps/{rfp_id}", tags=["Domain"])
async def get_rfp(rfp_id: str, user: dict = Depends(get_current_user)):
    doc = await get_db()["rfps"].find_one({"_id": rfp_id})
    if not doc:
        raise HTTPException(404, "RFP not found")
    return _doc(doc)


@app.get("/vendors", tags=["Domain"])
async def list_vendors(user: dict = Depends(get_current_user)):
    cur = get_db()["vendors"].find({}).sort("created_at", -1).limit(100)
    return _docs(await cur.to_list(100))


@app.get("/vendors/{vendor_id}", tags=["Domain"])
async def get_vendor(vendor_id: str, user: dict = Depends(get_current_user)):
    doc = await get_db()["vendors"].find_one({"_id": vendor_id})
    if not doc:
        raise HTTPException(404, "Vendor not found")
    return _doc(doc)


@app.get("/procurement/{procurement_id}", tags=["Domain"])
async def get_procurement(procurement_id: str, user: dict = Depends(get_current_user)):
    doc = await get_db()["procurement"].find_one({"_id": procurement_id})
    if not doc:
        raise HTTPException(404, "Procurement record not found")
    return _doc(doc)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "version": "3.0.0"}
