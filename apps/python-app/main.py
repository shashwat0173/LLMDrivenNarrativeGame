from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from crewai import Agent, Task, Crew, LLM

app = FastAPI(title="AI Driven adventure")

#TODO: allow only local machine ip call

llm = LLM(
    model="ollama/llama3.2:3b",
    base_url="http://localhost:11434"
)

game_master = Agent(
    role="Game Master",
    goal="Write what happens next in a player's adventure game." 
        "You must only write 1-3 sentences in response. "
        "Always write in second person present tense. "
        "",
    backstory="You are a cynical, witty game master who has seen it all. You like to"
              "tease the player and narrate events with a dry, sarcastic humor.",
    verbose=False,
    allow_delegation=False,
    llm=llm
)

generate_game_narrative = Task(
    description=(
        "Here is what all has happened thus far: {history}."
        "Here is the latest narrative development: {previous_ai_response}"
        "Generate a creative narrative response for the player's action: {player_action}."
        "Include NPC reactions, environmental details, and consequences."
    ),
    expected_output=(
        "A narrative response in 1-3 sentences written in second person present tense."
        "Ex. (You look north and see...) "
    ),    
    agent=game_master,
)

summarizer_agent = Agent(
    role="Narrative Summarizer",
    goal="Distill a full game log into a concise summary of key events.",
    backstory="You are a seasoned historian of interactive narratives, skilled at "
              "sifting through long logs of text to identify and articulate the most "
              "pivotal moments and recent developments.",
    verbose=False,
    allow_delegation=False,
    llm=llm
)

summarize_game_log = Task(
    description=(
        "Summarize the provided game history, the latest narrative response and player action."
        "Focus on the most important events, character interactions, and outcomes. "
        "The summary should be brief"
        "\n\nFull Game History: {history}"
        "\n Latest AI Response: {ai_response}"
        "\Player action: {player_action}"
    ),
    expected_output=(
        "A concise, summary of the game's current state and "
        "most recent development."
    ),
    agent=summarizer_agent,
)

# Create the Crew
summary_crew = Crew(
    agents=[summarizer_agent],
    tasks=[summarize_game_log],
    verbose=True
)

game_crew = Crew(
    agents=[game_master],
    tasks=[generate_game_narrative],
    verbose=True
)


# @app.middleware("http")
# async def restrict_remote_requests(request: Request, call_next):
#     client_host = request.client.host
#     if client_host not in ALLOWED_IPS:
#         raise HTTPException(status_code=403, detail="Access forbidden")
#     return await call_next(request)


@app.get("/")
def root():
    return {"message": "AI Driven Adventure Python Service is running"}


class QueryRequest(BaseModel):
    history: str
    previous_ai_response: str
    player_action: str

class QueryResponse(BaseModel):
    latest_ai_response: str
    latest_history: str

def start_game():
    print(history)
    while(True):
        player_input = input("What do you do?: ")
        print("\n\n")
        result = str(game_crew.kickoff({
            "history" : history,
            "player_action" : player_input
        }))
        history = str(summary_crew.kickoff({
            "history" : history,
            "result" : result
        }))


        print("<result>", result)
        print("</result>\n\n")
        
        print("<history> ", history)
        print("</history>\n\n")


@app.post("/generatenext")
def query(req: QueryRequest):
    latest_ai_response = str(game_crew.kickoff({
        "history" : req.history,
        "previous_ai_response" : req.previous_ai_response,
        "player_action" : req.player_action
    }))
    
    latest_history = str(summary_crew.kickoff({
        "history" : req.history,
        "ai_response" : req.previous_ai_response,
        "player_action" : req.player_action
    }))

    response = QueryResponse(
        latest_ai_response=latest_ai_response,
        latest_history=latest_history
    )
    return response
