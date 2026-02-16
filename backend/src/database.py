import sqlalchemy as db
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

SQLDATABASE_URL="sqlite:///./test.db"

engine=create_engine(SQLDATABASE_URL,connect_args={"check_same_thread": False})

SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)

Base=declarative_base()
