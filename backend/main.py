import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from hindsight_client import Hindsight
from groq import Groq
from typing import Literal

# Load environment variables
load_dotenv()


# ---------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------

app = FastAPI(title="Incident Response Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Hindsight Configuration
# ---------------------------------------------------------

hindsight = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL"),
    api_key=os.getenv("HINDSIGHT_API_KEY"),
)

BANK_ID = os.getenv("HINDSIGHT_BANK_ID")


# ---------------------------------------------------------
# Groq Configuration
# ---------------------------------------------------------

groq_client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


# =========================================================
# DATA MODELS
# =========================================================

class Incident(BaseModel):
    incident_id: str
    service: str
    symptoms: str
    root_cause: str
    resolution: str
    outcome: str


class RecallRequest(BaseModel):
    query: str


class InvestigateRequest(BaseModel):
    service: str = Field(..., min_length=1)
    symptoms: str = Field(..., min_length=1)

    @field_validator("service", "symptoms")
    @classmethod
    def validate_not_empty(cls, value):
        value = value.strip()

        if not value:
            raise ValueError("Field cannot be empty")

        return value


class OutcomeRequest(BaseModel):
    incident_id: str
    service: str
    action_taken: str
    outcome: Literal["successful", "failed"]
    notes: str = ""

    @field_validator("incident_id", "service", "action_taken")
    @classmethod
    def validate_non_empty(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Field cannot be empty")
        return value

# =========================================================
# BASIC ROUTES
# =========================================================

@app.get("/")
def home():
    return {
        "message": "Incident Response Agent is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }


# =========================================================
# STORE COMPLETE INCIDENT
# =========================================================

@app.post("/incidents")
def create_incident(incident: Incident):

    memory = f"""
Incident ID: {incident.incident_id}

Service: {incident.service}

Symptoms:
{incident.symptoms}

Root Cause:
{incident.root_cause}

Resolution:
{incident.resolution}

Outcome:
{incident.outcome}
"""

    hindsight.retain(
        bank_id=BANK_ID,
        content=memory
    )

    return {
        "message": "Incident stored successfully",
        "incident_id": incident.incident_id
    }


# =========================================================
# RECALL INCIDENT MEMORIES
# =========================================================

@app.post("/incidents/recall")
def recall_incidents(request: RecallRequest):

    result = hindsight.recall(
        bank_id=BANK_ID,
        query=request.query
    )

    memories = []

    for memory in result.results:
        memories.append(memory.text)

    return {
        "query": request.query,
        "memories": memories
    }


# =========================================================
# INVESTIGATE INCIDENT USING HINDSIGHT MEMORY
# =========================================================

@app.post("/incidents/investigate")
def investigate_incident(request: InvestigateRequest):

    # Search Hindsight for similar historical incidents
    query = f"""
Service: {request.service}

Symptoms: {request.symptoms}

Find similar previous incidents, their root causes,
failed fixes, successful fixes, and outcomes.
"""

    result = hindsight.recall(
        bank_id=BANK_ID,
        query=query
    )

    memories = []

    service_key = request.service.strip().lower()

    for memory in result.results:
        memory_text = memory.text

        if service_key in memory_text.lower():
            memories.append(memory_text)

    historical_context = "\n".join(
        f"- {memory}"
        for memory in memories
    )

    # Send current incident + historical memory to Groq
    prompt = f"""
You are an Incident Response Agent.

A new production incident has occurred.

SERVICE:
{request.service}

CURRENT SYMPTOMS:
{request.symptoms}

HISTORICAL INCIDENT MEMORY:
{historical_context}

Analyze the current incident using ONLY the historical memories and
the current symptoms provided above.

Give your response in this exact structure:

LEARNED PATTERN:
<describe the repeated pattern found across historical incidents>

LIKELY ROOT CAUSE:
<your reasoning>

PREVIOUS FIXES THAT FAILED:
<list failed approaches>

PREVIOUS FIXES THAT WORKED:
<list successful approaches>

RECOMMENDED ACTION:
<what the engineer should investigate or try>

WHY:
<explain exactly how the historical memories influenced the recommendation>

MEMORY EVIDENCE:
<mention the key historical incident or outcomes that support your recommendation>

Do not invent historical incidents or outcomes.
Do not claim certainty when the evidence is insufficient.
Clearly distinguish historical evidence from your current inference.
"""

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    recommendation = response.choices[0].message.content

    return {
        "service": request.service,
        "symptoms": request.symptoms,
        "historical_memories": memories,
        "recommendation": recommendation
    }


# =========================================================
# RECORD INCIDENT OUTCOME
# =========================================================

@app.post("/incidents/outcome")
def record_outcome(request: OutcomeRequest):

    memory = f"""
Incident ID: {request.incident_id}

Service: {request.service}

Action taken:
{request.action_taken}

Outcome:
{request.outcome}

Additional notes:
{request.notes}
"""

    hindsight.retain(
        bank_id=BANK_ID,
        content=memory
    )

    return {
        "message": "Incident outcome stored successfully",
        "incident_id": request.incident_id
    }


# =========================================================
# INVESTIGATE WITHOUT MEMORY
# Used as a baseline comparison
# =========================================================

@app.post("/incidents/investigate-no-memory")
def investigate_without_memory(request: InvestigateRequest):

    prompt = f"""
You are an Incident Response Agent.

A new production incident has occurred.

SERVICE:
{request.service}

CURRENT SYMPTOMS:
{request.symptoms}

You have NO access to historical incident memory.

Analyze only the current symptoms.

Give your response in this exact structure:

LIKELY ROOT CAUSE:
<your reasoning>

RECOMMENDED ACTION:
<what the engineer should investigate or try>

WHY:
<explain your reasoning based only on the current symptoms>

Do not invent previous incidents or previous outcomes.
Do not claim certainty when the evidence is insufficient.
"""

    response = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    recommendation = response.choices[0].message.content

    return {
        "service": request.service,
        "symptoms": request.symptoms,
        "memory_used": False,
        "recommendation": recommendation
    }