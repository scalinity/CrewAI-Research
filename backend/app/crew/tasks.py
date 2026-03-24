from __future__ import annotations

from datetime import date

from crewai import Agent, Task

from .output_models import ResearchBrief


def create_tasks(
    researcher: Agent,
    writer: Agent,
    editor: Agent,
    topic: str,
) -> tuple[Task, Task, Task]:
    today = date.today().strftime("%B %d, %Y")
    year = date.today().year

    research_task = Task(
        description=(
            f"Research the topic: '{topic}'. Today's date is {today}. "
            f"IMPORTANT: Your first action MUST be to use the SerperDevTool to search the web. "
            f"Include '{year}' in your search queries to get the most current results. "
            "Make at least 2 separate searches with different queries to get broad coverage. "
            "Do NOT write your response until you have search results. "
            "Do NOT use your training data as a primary source — it may be outdated. "
            "Prioritize sources from the last 3 months. Discard results older than 6 months "
            "unless they are foundational. After gathering search results, synthesize the "
            "findings into a research brief with key findings, source URLs, and knowledge gaps."
        ),
        expected_output="Research brief with key findings from web search, source URLs, and knowledge gaps",
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
