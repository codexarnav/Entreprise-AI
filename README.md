# RFP Management Pipeline

An AI-powered pipeline for processing and analyzing Request for Proposals (RFPs) to assist in bid decision-making.

## Overview

This project implements a comprehensive RFP management system that automates the analysis of RFP documents through multiple specialized agents:

1. **RFP Aggregator**: Extracts key information from RFP documents
2. **Risk and Compliance Agent**: Analyzes legal and compliance risks
3. **PWin Agent**: Evaluates win probability and strategic positioning
4. **Technical Agent**: Matches technical requirements to product catalog
5. **Dynamic Pricing Agent**: Calculates optimal pricing strategies
6. **Proposal Weaver Agent**: Generates complete proposal documents
7. **Final Decision Engine**: Makes go/no-go recommendations

## Features

- Support for PDF and text document processing
- AI-powered information extraction using transformers
- Risk assessment and compliance checking
- Win probability analysis
- Technical requirement matching
- Dynamic pricing optimization
- Automated proposal generation
- Comprehensive decision support

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rfp-management-pipeline
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

## Usage

Run the main pipeline:

```bash
python main.py
```

Enter the path to your RFP document when prompted.

## Configuration

The pipeline requires API keys for:
- Google Gemini API (for LLM capabilities)
- Other LLM providers (optional fallbacks)

## Project Structure

```
├── src/
│   ├── agents/              # AI agent implementations
│   │   ├── rfp_aggregator.py
│   │   ├── risk_and_compilance.py
│   │   ├── pwin.py
│   │   ├── Technical_Agent.py
│   │   ├── dynamic_pricing_agent.py
│   │   └── proposal_weaver_agent.py
│   ├── config/              # Configuration files
│   │   ├── settings.py
│   │   └── handlers/
│   │       └── schemas/
│   │           └── api_schemas.py
│   └── utils/               # Utility functions
│       └── logger.py
├── tests/                   # Unit and integration tests
├── docs/                    # Documentation
├── scripts/                 # Deployment and utility scripts
├── .github/
│   └── workflows/           # CI/CD pipelines
├── main.py                  # Main entry point
├── requirements.txt         # Python dependencies
├── pyproject.toml           # Project configuration
├── Dockerfile               # Container configuration
├── .env.example             # Environment variables template
├── .gitignore              # Git ignore rules
├── LICENSE                  # License file
└── README.md               # This file
```

## Development

### Running Tests
```bash
pytest tests/
```

### Code Formatting
```bash
black src/
isort src/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please open an issue on GitHub.