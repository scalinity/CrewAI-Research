from pydantic import BaseModel


class Source(BaseModel):
    title: str
    url: str
    relevance: str


class ResearchBrief(BaseModel):
    topic: str
    key_findings: list[str]
    sources: list[Source]
    knowledge_gaps: list[str]
