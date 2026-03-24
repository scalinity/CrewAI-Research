from __future__ import annotations

from datetime import date
from typing import Callable

from crewai import Agent, LLM

AGENT_MAX_ITERATIONS = 20


def create_agents(
    llm: LLM,
    tools: list,
    step_callback_factory: Callable[[str], Callable],
) -> tuple[Agent, Agent, Agent]:
    today = date.today().strftime("%B %d, %Y")
    researcher = Agent(
        role="Senior Research Analyst",
        goal=(
            "Use your search tools to find current, real-time information on the given topic. "
            "You MUST call the SerperDevTool at least 2-3 times to gather recent sources. "
            "Never answer from memory alone — always search first."
        ),
        backstory=(
            f"Today's date is {today}. You are a methodical research analyst who ALWAYS "
            "searches the web before writing anything. You never rely on prior knowledge — you "
            "verify every claim with a live web search. When searching, always include the current "
            "year in your queries to get the most recent results. Prioritize sources from the last "
            "3 months over older material. Your workflow: 1) Search for the topic with the current "
            "year, 2) Search for specific subtopics, 3) Optionally scrape key pages for details, "
            "4) Synthesize findings with URLs. Discard results older than 6 months unless they "
            "are foundational references."
        ),
        tools=tools,
        llm=llm,
        verbose=True,
        allow_delegation=False,
        step_callback=step_callback_factory("Senior Research Analyst"),
        max_iter=AGENT_MAX_ITERATIONS,
        respect_context_window=True,
    )

    writer = Agent(
        role="Technical Writer",
        goal="Transform research findings into clear, well-structured, cited documents",
        backstory=(
            "You are a precision-focused technical writer who turns complex research "
            "into accessible, well-organized prose. You structure documents with clear "
            "headings, logical flow, and proper attribution of sources."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
        step_callback=step_callback_factory("Technical Writer"),
        max_iter=AGENT_MAX_ITERATIONS,
        respect_context_window=True,
    )

    editor = Agent(
        role="Quality Reviewer",
        goal="Ensure factual accuracy, logical flow, and professional quality",
        backstory=(
            "You are a rigorous editor with high standards. You check every claim "
            "against the source material, ensure arguments flow logically, and polish "
            "prose for clarity and professionalism. You provide a quality score and "
            "specific feedback."
        ),
        llm=llm,
        verbose=True,
        allow_delegation=False,
        step_callback=step_callback_factory("Quality Reviewer"),
        max_iter=AGENT_MAX_ITERATIONS,
        respect_context_window=True,
    )

    return researcher, writer, editor
