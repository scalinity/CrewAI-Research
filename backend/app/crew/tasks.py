from __future__ import annotations

from crewai import Agent, Task

from .output_models import ResearchBrief


def create_tasks(
    researcher: Agent,
    writer: Agent,
    editor: Agent,
    topic: str,
) -> tuple[Task, Task, Task]:
    research_task = Task(
        description=(
            f"Research the topic: '{topic}'. "
            "Find 3-5 high-quality, recent sources. Identify key findings, "
            "emerging trends, and knowledge gaps. Provide source URLs for every claim."
        ),
        expected_output="Structured research brief with key findings, sources with URLs, and knowledge gaps",
        agent=researcher,
        output_pydantic=ResearchBrief,
    )

    writing_task = Task(
        description=(
            f"Using the research brief provided, write a comprehensive report on '{topic}'. "
            "Include an introduction, 2-3 analysis sections with clear headings, "
            "and a conclusion. Cite sources throughout. Target approximately 800 words."
        ),
        expected_output="800-word report with introduction, analysis sections, conclusion, and citations",
        agent=writer,
        context=[research_task],
    )

    review_task = Task(
        description=(
            "Review the report for factual accuracy against the original research brief, "
            "logical flow, clarity, and completeness. Check that all claims are properly cited. "
            "Provide a quality score (1-10) and list specific improvements made or suggested."
        ),
        expected_output="Final reviewed report with quality assessment score and improvement notes",
        agent=editor,
        context=[research_task, writing_task],
    )

    return research_task, writing_task, review_task
