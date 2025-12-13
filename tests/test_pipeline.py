import pytest
from src.agents.rfp_aggregator import RfpAggregatorInput, RfpAggregatorOutput


class TestRFPAggregator:
    """Test cases for RFP Aggregator functionality."""

    def test_rfp_input_creation(self):
        """Test creating RFP input object."""
        input_data = RfpAggregatorInput(
            text_path="test.txt",
            pdf_path=None,
            documents=None,
            chunked_text=None
        )
        assert input_data.text_path == "test.txt"
        assert input_data.pdf_path is None

    def test_rfp_output_creation(self):
        """Test creating RFP output object."""
        output = RfpAggregatorOutput(
            rfp_id=1,
            title="Test RFP",
            buyer="Test Buyer",
            deadline="2024-12-31",
            technical_requirements=["Req 1", "Req 2"],
            scope_of_work=["Scope 1"]
        )
        assert output.title == "Test RFP"
        assert len(output.technical_requirements) == 2

    def test_empty_requirements(self):
        """Test handling empty requirements."""
        output = RfpAggregatorOutput(
            rfp_id=1,
            title="Test RFP",
            buyer="Test Buyer",
            deadline=None,
            technical_requirements=[],
            scope_of_work=[]
        )
        assert output.technical_requirements == []
        assert output.scope_of_work == []


class TestMainPipeline:
    """Test cases for main pipeline functionality."""

    def test_pipeline_initialization(self):
        """Test that pipeline can be initialized."""
        # This would test the main process_rfp function
        # For now, just a placeholder
        assert True