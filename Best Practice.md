This follows best practices:

- Clear spec files
- AGENTS.md for global rules
- Milestones (plans.md)
- Contracts + schema
- Acceptance criteria  
    These are critical because Codex performs best when given structured repo-level instructions and constraints

# REPO STRUCTURE

secure-vault-ai/  
├── [[AGENTS]]
├── README.md  
├── package.json (Codex will generate)  
├── tsconfig.json  
├── next.config.js  
├── docs/  
│   ├── [[PRD_V1_1]].md  
│   ├── [[architecture]].md  
│   ├── [[data_exposure_policy]].md  
│   ├── [[storage_schema]].md  
│   ├── [[chroma_contract]].md
│   ├── [[plans]].md  
│   ├── [[implement]].md  
│   ├── [[acceptance_criteria]].md  
│   ├── [[test_strategy]].md