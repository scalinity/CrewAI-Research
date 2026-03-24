from __future__ import annotations

from typing import Callable

from crewai import Agent, LLM

AGENT_MAX_ITERATIONS = 20


def create_agents(
    llm: LLM,
    tools: list,
    step_callback_factory: Callable[[str], Callable],
) -> tuple[Agent, Agent, Agent]:
    researcher = Agent(
        role="Senior Research Analyst",
        goal="Find and synthesize high-quality, recent information on the given topic",
        backstory=(
            "You are a methodical research analyst with 15 years of experience. "
            "You always verify claims across multiple sources and identify knowledge gaps. "
            "You prioritize recent, authoritative sources and present findings with clear citations."
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
