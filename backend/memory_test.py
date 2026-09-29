import os
from dotenv import load_dotenv
from hindsight_client import Hindsight

load_dotenv()

client = Hindsight(
    base_url=os.getenv("HINDSIGHT_BASE_URL"),
    api_key=os.getenv("HINDSIGHT_API_KEY")
)

BANK_ID = os.getenv("HINDSIGHT_BANK_ID")

# Create the memory bank
client.create_bank(
    bank_id=BANK_ID,
    name="Incident Response Memory"
)

print("Memory bank ready!")

# Store an incident
client.retain(
    bank_id=BANK_ID,
    content="""
    Incident INC-001 happened in the payments service.
    The service had repeated database connection timeout errors.
    The root cause was database connection pool exhaustion.
    Restarting the service alone did not solve the problem.
    Increasing the database connection pool successfully resolved the incident.
    """
)

print("Incident stored!")

# Recall the incident
result = client.recall(
    bank_id=BANK_ID,
    query="What happened during the previous database timeout incident?"
)

print("\nRecalled memories:")

for memory in result.results:
    print("-", memory.text)

client.close()