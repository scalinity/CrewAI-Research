from crewai_tools import ScrapeWebsiteTool, SerperDevTool


def create_tools() -> list:
    return [SerperDevTool(), ScrapeWebsiteTool()]
