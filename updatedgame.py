from crewai import Agent, Task, Crew, Process, LLM

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
        "Summarize the provided game history and the latest action/narrative response. "
        "Focus on the most important events, character interactions, and outcomes. "
        "The summary should be brief"
        "\n\nFull Game History: {history}"
        "\nLatest Narrative Response: {result}"
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
    verbose=False
)

game_crew = Crew(
    agents=[game_master],
    tasks=[generate_game_narrative],
    verbose=False
)

history = "A chill wind howls through the desolate spires of Eldoria, a city now nothing more than a rain-slicked tomb. Above, the sky weeps a perpetual drizzle, mirroring the despair of its few remaining souls.Suddenly, a figure emerges from the gloom: Elara, the Whisperwind, her crimson cloak a lone splash of color against the gray. She stands before the city's gates, her hand on her dagger, her emerald eyes scanning for any sign of hope.From the city's depths, a guttural roar tears through the air. Lord Kaelen, the Shadowbinder, stalks forward, his obsidian armor a void of malevolent power. In his grasp, a helpless citizen struggles, a cruel trophy in Kaelen's dark parade.Elara tenses, her jaw set. This is a scene she knows well, but tonight is different. A new presence shimmers on the edge of her sight, a glimmer of light that defies the eternal gloom. The prophesied hero has arrived."

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

start_game()