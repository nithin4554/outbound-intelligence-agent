#!/usr/bin/env python3
import os
import json
import sys
import datetime
from pathlib import Path

# Try to load dotenv for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Try to import google-generativeai
GEMINI_AVAILABLE = False
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    pass

DATA_DIR = Path(__file__).parent / "public" / "data"
RESULTS_FILE = DATA_DIR / "results.json"

# Pre-seeded high-conviction database of the top accounts and signals researched
DEFAULT_COMPANIES = [
    {
        "id": "uber",
        "company": "Uber",
        "industry": "Ride-hailing / Tech",
        "publicEvidence": "Spent annual 2026 AI budget in 4 months; 95% of engineers use AI; 70% of code is AI-generated. Introduced $1,500 monthly cap. COO questioned link between code volume and consumer value.",
        "sourceUrl": "https://www.theinformation.com/articles/uber-ai-budget-exceeded-information",
        "evidenceDate": "2026-03-15",
        "intentSummary": "Budget blowout from token pricing, massive adoption (95%), executive skepticism on ROI.",
        "whyThisMatters": "Severe cost pressure and board-level skepticism require detailed engineering telemetry to prove AI value.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 5,
        "execVisibilityScore": 5,
        "timelinessScore": 5,
        "productRelevanceScore": 5,
        "totalIntentScore": 25,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Praveen Neppalli Naga (CTO), Adam Hooda (DevX Lead), Andrew Macdonald (COO)",
        "bestInitialPersona": "Adam Hooda (DevX)",
        "outreachAngle": "Correlating grassroots agentic tool adoption with cycle-time improvements and spend control.",
        "status": "Immediate Outreach"
    },
    {
        "id": "jpmorgan",
        "company": "JPMorgan Chase",
        "industry": "Banking / FinServices",
        "publicEvidence": "Mandated AI adoption for 65,000 developers, linked to performance evaluations. Reported 10-20% productivity gain and 100k saved developer hours/week.",
        "sourceUrl": "https://www.jpmorganchase.com/news/jpmorgan-chase-technology-productivity",
        "evidenceDate": "2025-11-10",
        "intentSummary": "AI usage linked to performance ratings, internal dashboard tracking, massive time-saving claims.",
        "whyThisMatters": "Mandatory usage forces teams to justify gains; they need objective metrics to prove speed and quality improvements.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 5,
        "execVisibilityScore": 5,
        "timelinessScore": 5,
        "productRelevanceScore": 5,
        "totalIntentScore": 25,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Lori Beer (Global CIO), Sandhya Sridharan (Global EPX Head), Jamie Dimon (CEO)",
        "bestInitialPersona": "Sandhya Sridharan (EPX)",
        "outreachAngle": "Moving beyond binary usage tracking to verify durable, team-level cycle-time gains."
    },
    {
        "id": "vanguard",
        "company": "Vanguard",
        "industry": "Asset Management",
        "publicEvidence": "May 2023 Copilot rollout matured; generated >$500M value by late 2025. Realized 'faster coding alone' is insufficient; must measure full SDLC to avoid 'engineering bubbles.'",
        "sourceUrl": "https://getdx.com/case-studies/vanguard-developer-experience",
        "evidenceDate": "2025-10-20",
        "intentSummary": "Mature AI scaling, explicit focus on full-lifecycle productivity rather than just coding speed, uses DX.",
        "whyThisMatters": "The realization that coding speed != shipping velocity makes them a perfect fit for multi-system telemetry (Jira + GitHub + CI/CD).",
        "adoptionDepthScore": 5,
        "roiPressureScore": 5,
        "execVisibilityScore": 5,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 24,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Nitin Tandon (Global CIO), Mani Iyer (Chief AI Officer), Kelly Anne Pipe (Head of DevEx)",
        "bestInitialPersona": "Kelly Anne Pipe (DevEx)",
        "outreachAngle": "Integrating developer surveys with hard workflow telemetry to identify bottlenecks outside of coding."
    },
    {
        "id": "booking",
        "company": "Booking.com",
        "industry": "E-commerce / Travel",
        "publicEvidence": "Rolled out AI to 3,500+ engineers. Partnered with DX to measure impact; found 16% higher PR merge rate and saved 150k hours in the first year. Uses DX Core 4 framework.",
        "sourceUrl": "https://getdx.com/case-studies/booking-ai-productivity",
        "evidenceDate": "2025-09-12",
        "intentSummary": "Scaled AI assistant usage, metrics-driven validation (16% PR merge rate), focus on balancing speed and quality.",
        "whyThisMatters": "A metrics-oriented culture will want automated pipeline telemetry to validate if PR merge rates translate into faster cycle times.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 5,
        "execVisibilityScore": 5,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 24,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Vipul Hingne (Interim CTO), Leo Kraan (Director DevEx), Amos Haviv (Developer Workflow Lead)",
        "bestInitialPersona": "Leo Kraan (DevEx)",
        "outreachAngle": "Tracking whether a 16% higher PR merge rate translates to faster cycle times or code review bottlenecks."
    },
    {
        "id": "goldmansachs",
        "company": "Goldman Sachs",
        "industry": "Banking / FinServices",
        "publicEvidence": "Rolled out Copilot to ~12,000 developers, reporting 20-55% gains. Piloting agentic AI (Devin, Claude). CIO emphasized transforming the lifecycle with safety/verification.",
        "sourceUrl": "https://www.americanbanker.com/news/goldman-sachs-ai-productivity-marcos-argenti",
        "evidenceDate": "2026-01-20",
        "intentSummary": "Enterprise-wide Copilot and agentic AI pilots, focus on lifecycle transformation and rigorous verification.",
        "whyThisMatters": "Scaling agentic workflows (Devin) requires tracking the velocity, quality, and review overhead of AI-generated commits vs humans.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 4,
        "execVisibilityScore": 5,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 23,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Marco Argenti (CIO), Archana Vemulapalli (Global AI Product), Rahul Sharma (AI Platform Lead)",
        "bestInitialPersona": "Rahul Sharma (AI Platform)",
        "outreachAngle": "Telemetry for verifying the safety and cycle-time impact of agentic code contributions."
    },
    {
        "id": "cognizant",
        "company": "Cognizant",
        "industry": "IT Services / Consulting",
        "publicEvidence": "CEO/Leadership noted a 'value gap' where high AI tool spend (licenses/tokens) is not matched by business outcomes; requires a 3-layer ROI model.",
        "sourceUrl": "https://www.newindianexpress.com/business/2025/cognizant-ai-roi-value-gap",
        "evidenceDate": "2025-11-30",
        "intentSummary": "High AI tool spend, leadership warning of a 'value gap,' focus on ADLC, explicit 3-layer ROI framework.",
        "whyThisMatters": "Selling software delivery services makes proving to clients that AI is speeding up cycle times (delivery impact) critical for contract margins.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 5,
        "execVisibilityScore": 4,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 23,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Prasad Sankaran (Pres. AI Products), Babak Hodjat (CAIO), Ravi Kumar S (CEO)",
        "bestInitialPersona": "Prasad Sankaran (AI Products)",
        "outreachAngle": "Bridging the 'value gap' by converting token spend into verifiable delivery outcomes."
    },
    {
        "id": "capitalone",
        "company": "Capital One",
        "industry": "Banking / FinServices",
        "publicEvidence": "Scaled AI coding. Focus on 'governed AI-native software delivery.' Hiring for 'AI & Developer Productivity Data Strategy' roles to measure impact.",
        "sourceUrl": "https://capitalone.careers/jobs/ai-developer-productivity-data-strategy",
        "evidenceDate": "2026-02-10",
        "intentSummary": "Scaled AI coding, focus on governed delivery and traceability, dedicated data strategy roles for measuring productivity.",
        "whyThisMatters": "A dedicated data strategy team for AI and developer productivity requires an enterprise-grade telemetry platform to ingest Jira/GitHub.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 4,
        "execVisibilityScore": 4,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 22,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Rob Alexander (Global CIO), Catherine McGarvey (SVP DevEx), Prem Natarajan (EVP Enterprise AI)",
        "bestInitialPersona": "Catherine McGarvey (DevEx)",
        "outreachAngle": "Providing the telemetry foundation for their 'AI & Developer Productivity Data Strategy.'"
    },
    {
        "id": "stripe",
        "company": "Stripe",
        "industry": "Fintech / Payments",
        "publicEvidence": "Advanced AI adoption. Custom internal coding agents ('Minions') make 1,300+ pull requests per week. Focuses on context and automated guardrails.",
        "sourceUrl": "https://stripe.dev/blog/stripe-minions-agentic-coding",
        "evidenceDate": "2025-11-15",
        "intentSummary": "Scaled autonomous coding agents, 1,300+ PRs/week from AI, deep focus on context and review guardrails.",
        "whyThisMatters": "Generating 1,300+ PRs/week creates a massive human review bottleneck. Tracking review velocity and merge rates is crucial.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 4,
        "execVisibilityScore": 4,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 22,
        "intentBand": "Very High Intent",
        "recommendedTargets": "David Richardson (Head of DevEx), Scott MacVicar (Dev Infra Lead), Emily Glassberg Sands (Head of AI)",
        "bestInitialPersona": "David Richardson (DevEx)",
        "outreachAngle": "Measuring the code review velocity and throughput bottlenecks created by autonomous agents."
    },
    {
        "id": "netflix",
        "company": "Netflix",
        "industry": "Entertainment / Tech",
        "publicEvidence": "Deployed GitHub Copilot to thousands of developers. DPE team monitors the volume of AI-generated code that reaches production to ensure speed does not degrade reliability.",
        "sourceUrl": "https://netflix.techblog.com/developer-productivity-engineering",
        "evidenceDate": "2025-12-05",
        "intentSummary": "Scaled Copilot adoption, DPE team monitoring AI-generated code volume reaching production, focus on reliability.",
        "whyThisMatters": "Proving AI code is safe and lands in production requires deep git-level analytics and deployment cycle-time tracking.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 4,
        "execVisibilityScore": 4,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 22,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Elizabeth Stone (CPTO), Kathryn Koehler (DPE Director), Kamelia Aryafar (Head of AI)",
        "bestInitialPersona": "Kathryn Koehler (DPE)",
        "outreachAngle": "Telemetry to correlate AI code generation with successful production deployments."
    },
    {
        "id": "wayfair",
        "company": "Wayfair",
        "industry": "E-commerce / Retail",
        "publicEvidence": "Partners with GitHub and Google Cloud. Reported 55% faster setup, 48% unit test increase. Uses FeatureOps (Unleash) to manage risk of increased velocity.",
        "sourceUrl": "https://aboutwayfair.com/technology/wayfair-ai-developer-productivity",
        "evidenceDate": "2025-10-15",
        "intentSummary": "Dual-assistant adoption (Copilot + Gemini), reported setup/test coverage gains, feature flag adoption to manage release velocity risk.",
        "whyThisMatters": "Using FeatureOps/Unleash to gate faster code releases indicates delivery governance pressure. They need cycle-time and deployment health visibility.",
        "adoptionDepthScore": 5,
        "roiPressureScore": 4,
        "execVisibilityScore": 4,
        "timelinessScore": 4,
        "productRelevanceScore": 5,
        "totalIntentScore": 22,
        "intentBand": "Very High Intent",
        "recommendedTargets": "Fiona Tan (CTO), Jonathan Biddle (Engineering Effectiveness Director), Ashwin Rao (Chief Science Officer)",
        "bestInitialPersona": "Jonathan Biddle (Eng Effect)",
        "outreachAngle": "Balancing accelerated code delivery with release safety telemetry."
    }
]

DEFAULT_PEOPLE = [
    {
        "companyId": "uber",
        "company": "Uber",
        "name": "Praveen Neppalli Naga",
        "title": "CTO of Mobility & Delivery",
        "linkedinUrl": "https://www.linkedin.com/in/praveenneppalli",
        "whyThisPerson": "Executive owner of global engineering and science strategy; owns the AI budget reset.",
        "likelyPainTension": "Exceeding AI tool spend; balancing high-velocity code generation with system safety.",
        "seniorityType": "Tier 1 (CTO)",
        "suggestedChannel": "LinkedIn / Email",
        "connectionNote": "Praveen, read about Uber's AI budget exhaustion in Q1. At 95% developer adoption and 70% AI-generated code, it's clear your teams are moving fast. Interested in how you're balancing that velocity with cycle-time and quality guardrails. Let's connect.",
        "firstDM": "Praveen, your comment about Uber's AI budget assumptions being exceeded stuck with me. At 95% monthly adoption, the core challenge is no longer getting engineers to use the tools—it's proving where that code is actually accelerating shipping times versus just bloating the repo. How are you measuring the actual cycle-time impact of AI across your mobility teams?",
        "followUpDM": "Curious if your team has built internal tooling to correlate Copilot token usage with actual PR merge velocity, or if you're looking at external telemetry. We've seen a few patterns here that might be helpful.",
        "confidenceScore": "5/5"
    },
    {
        "companyId": "uber",
        "company": "Uber",
        "name": "Adam Hooda",
        "title": "Head of AI Foundations & DevX",
        "linkedinUrl": "https://www.linkedin.com/in/adamhooda-needs-verification",
        "whyThisPerson": "Directly owns the DevX team, 'Claude Skills' rollout, and the internal Agentic Marketplace.",
        "likelyPainTension": "Managing the execution cycle times and token cost-efficiency of 500+ custom AI agents.",
        "seniorityType": "Tier 1 (DevX Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "Adam, really impressed by Uber's shift to agentic engineering and Claude Skills. Shifting the SDLC from top-down mandates to an internal marketplace of 500+ skills is a massive DevX feat. Would love to connect and share notes.",
        "firstDM": "Adam, the grassroots adoption of Claude Skills at Uber is a fascinating DevX case study. But with 500+ agentic skills running, I imagine keeping tabs on execution cycle times and token cost-efficiency is a challenge. Are you measuring the throughput improvement of these skills compared to manual engineering workflows?",
        "followUpDM": "Most DevX teams we talk to are trying to separate tool adoption metrics from actual delivery outcomes. Is tracking the cycle-time impact of these AI agents a live priority for you right now?",
        "confidenceScore": "4/5"
    },
    {
        "companyId": "jpmorgan",
        "company": "JPMorgan Chase",
        "name": "Lori Beer",
        "title": "Global CIO",
        "linkedinUrl": "https://www.linkedin.com/in/loribeer",
        "whyThisPerson": "Executive sponsor of the $20B technology budget; mandated AI adoption for 65k devs.",
        "likelyPainTension": "Proving the board-level ROI of AI investments; auditing software quality at massive scale.",
        "seniorityType": "Tier 1 (CIO)",
        "suggestedChannel": "LinkedIn / Email",
        "connectionNote": "Lori, following JPMC's push for \"frictionless engineering\" and mandated AI adoption across your 65k technologists. Given the scale, I'm curious how you're auditing the downstream quality and cycle-time impact of AI-generated code. Let's connect.",
        "firstDM": "Lori, JPMC's 10-20% developer productivity gain and 100k saved hours per week are impressive benchmarks. But at 65k developers, the follow-up question is usually whether that gain is repeatable across all teams and workflows. How is your team tracking the actual shipping velocity of teams using AI versus non-users?",
        "followUpDM": "We build telemetry that connects code repositories with Jira and CI/CD, giving CIOs clear visibility into cycle times and code review velocity. Is this tracking a current priority for your platform team?",
        "confidenceScore": "5/5"
    },
    {
        "companyId": "jpmorgan",
        "company": "JPMorgan Chase",
        "name": "Sandhya Sridharan",
        "title": "Global Head of EPX",
        "linkedinUrl": "https://www.linkedin.com/in/sandhya-sridharan-b089b02",
        "whyThisPerson": "Leads the Global Engineers' Platform and Experience team; owns the developer platform and tools.",
        "likelyPainTension": "Reducing cognitive overload; instrumenting the internal platform to track AI productivity gains.",
        "seniorityType": "Tier 1 (DevX Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "Sandhya, following JPMC's Developer Platform (EPX) progress. Building a self-service platform for 65k engineers is a massive feat, especially with mandated AI. Would love to connect and share notes on measuring DevX.",
        "firstDM": "Sandhya, with JPMC's engineers mandated to use AI, your team faces the unique challenge of measuring real-world DevX outcomes. Since tool adoption is guaranteed, how are you separating general platform velocity from actual AI-driven cycle time improvements?",
        "followUpDM": "Most platform leaders we talk to are looking for ways to correlate GitHub Copilot usage with PR review cycles and build times. Curious if your team has built internal analytics for this yet.",
        "confidenceScore": "4/5"
    },
    {
        "companyId": "vanguard",
        "company": "Vanguard",
        "name": "Nitin Tandon",
        "title": "Global CIO",
        "linkedinUrl": "https://www.linkedin.com/in/nitintandon",
        "whyThisPerson": "Executive sponsor who drove cloud modernization and scaled AI to generate >$500M in value.",
        "likelyPainTension": "Moving from technology-led AI pilots to measurable business outcomes; justifying AI tool spend.",
        "seniorityType": "Tier 1 (CIO)",
        "suggestedChannel": "LinkedIn / Email",
        "connectionNote": "Nitin, read about Vanguard generating $500M in value from AI. With Copilot adoption mature, I'm curious how your teams are measuring the downstream lifecycle impact of faster coding on overall shipping speed. Let's connect.",
        "firstDM": "Nitin, Vanguard's realization that \"faster coding alone\" is insufficient to improve overall delivery speed was a key insight. When developers write code faster, the bottleneck often shifts to QA or deployment. How is Vanguard currently tracking cycle-time changes across the entire product development lifecycle?",
        "followUpDM": "We help engineering leaders trace cycle times from Jira to GitHub to CI/CD, exposing where AI gains are getting blocked downstream. Is that end-to-end visibility a priority for your team?",
        "confidenceScore": "5/5"
    },
    {
        "companyId": "vanguard",
        "company": "Vanguard",
        "name": "Kelly Anne Pipe",
        "title": "Head of Developer Experience",
        "linkedinUrl": "https://www.linkedin.com/in/kellyannepipe",
        "whyThisPerson": "Direct owner of Developer Experience; uses data-driven insights to optimize engineering workflows.",
        "likelyPainTension": "Measuring the qualitative and quantitative impact of AI tools; identifying process bottlenecks.",
        "seniorityType": "Tier 1 (DevX Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "Kelly, following Vanguard's work on developer experience metrics. Really interested in how you are combining qualitative surveys with quantitative telemetry to track the downstream impact of AI tools. Let's connect.",
        "firstDM": "Kelly, your focus on combining qualitative DevEx data with usage metrics is exactly how teams avoid the 'engineering bubble' with AI. But as coding speeds up, have you seen the bottlenecks shift to code review velocity or CI/CD queues? Curious how you are measuring that shift.",
        "followUpDM": "We've built a telemetry model that highlights where AI-generated code is getting stuck in review or testing. Would love to share a quick 1-pager if you are looking at this tracking challenge.",
        "confidenceScore": "4/5"
    },
    {
        "companyId": "booking",
        "company": "Booking.com",
        "name": "Leo Kraan",
        "title": "Director of Eng, DevEx",
        "linkedinUrl": "https://www.linkedin.com/in/leokraan",
        "whyThisPerson": "Directly leads developer experience and engineering efficiency initiatives.",
        "likelyPainTension": "Translating AI tools into developer satisfaction and delivery velocity; measuring process blockers.",
        "seniorityType": "Tier 1 (DevX Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "Leo, really impressed by Booking's scientific approach to DevEx, particularly using the Core 4 framework. Would love to connect and share notes on how you're tracking the cycle-time impact of AI tools.",
        "firstDM": "Leo, using the Core 4 framework (speed, effectiveness, quality, impact) to track Booking's AI rollout is a textbook approach. Now that you've logged a 16% increase in PR merge rates, is your team seeing any pressure on code review times or test build queues?",
        "followUpDM": "We help DevEx teams connect Jira and Git data to track how AI tools affect the downstream review cycle. Would love to share our findings if this is a live priority for you.",
        "confidenceScore": "4/5"
    },
    {
        "companyId": "goldmansachs",
        "company": "Goldman Sachs",
        "name": "Rahul Sharma",
        "title": "Head of AI Platform Eng",
        "linkedinUrl": "https://www.linkedin.com/in/rahulsharmags",
        "whyThisPerson": "Leads the platform engineering team building the internal GS AI workspace.",
        "likelyPainTension": "Standardizing AI developer tooling; building infrastructure to run and verify AI models locally.",
        "seniorityType": "Tier 2 (Platform Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "Rahul, following Goldman's work on the GS AI platform. Building the infrastructure to support and verify AI-native engineering for 12k developers is an impressive platform feat. Let's connect.",
        "firstDM": "Rahul, as you build out the GS AI platform, I imagine one of your biggest challenges is verifying the quality and security of AI-generated code. Are you currently tracking how the platform affects code review velocity and CI/CD pass rates?",
        "followUpDM": "We build telemetry that helps AI platform teams monitor the downstream impact of AI tools on the SDLC. Let me know if you'd be open to a quick 1-pager on this.",
        "confidenceScore": "4/5"
    },
    {
        "companyId": "capitalone",
        "company": "Capital One",
        "name": "Catherine McGarvey",
        "title": "SVP, Head of DevEx",
        "linkedinUrl": "https://www.linkedin.com/in/catherinemcgarvey",
        "whyThisPerson": "Directly leads the Developer Experience team; owns SDLC optimization and platform delivery.",
        "likelyPainTension": "Reducing operational overhead for technologists; implementing the AI & Dev Productivity Data Strategy.",
        "seniorityType": "Tier 1 (DevX Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "Catherine, following Capital One's DevEx initiatives. Really interested in how your team is structuring the new AI & Developer Productivity Data Strategy to track engineering performance. Let's connect.",
        "firstDM": "Catherine, your focus on DevEx as a business requirement is the right approach. With Capital One hiring specifically for AI & Dev Productivity Data Strategy, how are you planning to ingest and correlate GitHub Copilot usage with actual shipping velocity?",
        "followUpDM": "We build the telemetry platform that connects Jira, GitHub, and CI/CD to give DevEx leaders clear, automated visibility into cycle times. Would love to share a quick 2-page brief on this.",
        "confidenceScore": "4/5"
    },
    {
        "companyId": "stripe",
        "company": "Stripe",
        "name": "David Richardson",
        "title": "Head of DevEx & Product Platform",
        "linkedinUrl": "https://www.linkedin.com/in/davidrichardsonstripe",
        "whyThisPerson": "Leads the developer experience and internal product platform engineering teams.",
        "likelyPainTension": "Measuring the impact of custom AI integrations and autonomous agents on the developer workflow.",
        "seniorityType": "Tier 1 (DevX Lead)",
        "suggestedChannel": "LinkedIn",
        "connectionNote": "David, following Stripe's gold standard DevEx work. Really interested in how your team is measuring the SDLC impact of your internal AI assistants and automated coding workflows. Let's connect.",
        "firstDM": "David, Stripe has always set the standard for DevEx. With your team building custom AI and engineering platforms, how are you tracking whether these tools are actually reducing cycles or if the bottleneck has shifted to PR reviews?",
        "followUpDM": "We help platform leaders connect Git and Jira data to trace how AI tools affect the downstream code review cycle. Would love to share our findings if you are looking at this.",
        "confidenceScore": "4/5"
    }
]

def run_agent():
    print(f"[{datetime.datetime.now().isoformat()}] Starting Daily B2B Outbound Intelligence Automation Run...")
    
    # Ensure data directory exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # 1. Load existing results if they exist, to preserve user-managed state (like status updates, notes, custom edits)
    existing_data = {"companies": [], "people": []}
    if RESULTS_FILE.exists():
        try:
            with open(RESULTS_FILE, "r") as f:
                existing_data = json.load(f)
            print(f"Loaded existing dataset with {len(existing_data.get('companies', []))} companies.")
        except Exception as e:
            print(f"Warning: Could not parse existing results.json: {e}. Starting fresh.")
            
    # Mappings of user status/notes to preserve user edits
    status_map = {c["id"]: c.get("status", "Immediate Outreach") for c in existing_data.get("companies", [])}
    notes_map = {c["id"]: c.get("notes", "") for c in existing_data.get("companies", [])}
    
    # Store existing people templates by (companyId, name, field) to preserve user edits
    people_templates_map = {}
    for p in existing_data.get("people", []):
        for field in ["connectionNote", "firstDM", "followUpDM", "linkedinUrl"]:
            if field in p:
                people_templates_map[(p["companyId"], p["name"], field)] = p[field]
                
    # Initialize active targets with defaults
    active_companies = {c["id"]: c for c in DEFAULT_COMPANIES}
    active_people = {(p["companyId"], p["name"]): p for p in DEFAULT_PEOPLE}
    
    # Also load any previously dynamically discovered companies/people from existing_data
    for comp in existing_data.get("companies", []):
        if comp["id"] not in active_companies:
            active_companies[comp["id"]] = comp
    for person in existing_data.get("people", []):
        key = (person["companyId"], person["name"])
        if key not in active_people:
            active_people[key] = person

    # 2. Check for Gemini credentials for Live Discovery
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and GEMINI_AVAILABLE:
        print("Gemini API credentials found. Initiating daily client discovery via Google Search Grounding...")
        try:
            genai.configure(api_key=api_key)
            
            # Use gemini-1.5-flash with search tool
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                tools=[{"google_search": {}}]
            )
            
            # Compile existing names to exclude
            existing_names = [c["company"] for c in DEFAULT_COMPANIES] + [c.get("company", "") for c in existing_data.get("companies", [])]
            existing_names_str = ", ".join(list(set(existing_names)))
            
            prompt = (
                f"Search the web using Google Search grounding for recent news articles (published in the past 30 days) "
                f"about enterprise companies (B2B, tech, finance, or retail) showing strong signals of AI adoption (e.g. Copilot, Claude, Cursor, agentic rollouts), "
                f"or facing severe AI budget constraints, token cost pressures, or board/COO skepticism about developer productivity. "
                f"Identify exactly 3 new target companies that are NOT in this list: {existing_names_str}.\n\n"
                f"Output a valid JSON array of objects representing these targets. Each object must adhere strictly to this schema:\n"
                f"[\n"
                f"  {{\n"
                f"    \"company\": \"Company Name\",\n"
                f"    \"industry\": \"Industry description (e.g. E-commerce, Finance)\",\n"
                f"    \"publicEvidence\": \"Detailed summary of the news article signal showing AI adoption, budget overrun, or productivity tracking\",\n"
                f"    \"sourceUrl\": \"The actual source URL of the news article (must be a real URL from the search)\",\n"
                f"    \"evidenceDate\": \"YYYY-MM-DD (date of the news article)\",\n"
                f"    \"whyThisMatters\": \"Explanation of how our engineering productivity metrics platform helps them solve cost overruns or prove AI value\",\n"
                f"    \"adoptionDepthScore\": 4, // integer 1 to 5\n"
                f"    \"roiPressureScore\": 4, // integer 1 to 5\n"
                f"    \"execVisibilityScore\": 4, // integer 1 to 5\n"
                f"    \"timelinessScore\": 4, // integer 1 to 5\n"
                f"    \"productRelevanceScore\": 5, // integer 1 to 5\n"
                f"    \"recommendedTargets\": \"CTO, VP of Engineering, or Head of DevX\",\n"
                f"    \"outreachAngle\": \"Innovative pitch angle (maximum 20 words)\",\n"
                f"    \"people\": [\n"
                f"      {{\n"
                f"        \"name\": \"Full Name (a real executive at the company or a likely buyer title like Head of Developer Experience)\",\n"
                f"        \"title\": \"Title (e.g. CTO, VP of Engineering, or Head of Developer Experience)\",\n"
                f"        \"linkedinUrl\": \"https://www.linkedin.com/in/...\",\n"
                f"        \"whyThisPerson\": \"Why they are the target buyer\",\n"
                f"        \"likelyPainTension\": \"Estimated pain points they feel regarding AI spend or engineering efficiency\",\n"
                f"        \"seniorityType\": \"Tier 1 (CTO) or VP Engineering or DevX Lead\",\n"
                f"        \"connectionNote\": \"LinkedIn connection invite message (180-280 characters)\",\n"
                f"        \"firstDM\": \"Direct message pitch (40-90 words)\",\n"
                f"        \"followUpDM\": \"Follow-up message (25-60 words)\"\n"
                f"      }}\n"
                f"    ]\n"
                f"  }}\n"
                f"]"
            )
            
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            discovered_targets = json.loads(response.text)
            print(f"Successfully discovered {len(discovered_targets)} new companies via web grounding:")
            
            for target in discovered_targets:
                company_name = target.get("company")
                if not company_name:
                    continue
                    
                comp_id = company_name.lower().replace(" ", "").replace(".", "").replace(",", "").replace("-", "")
                print(f" - Discovered target: {company_name} (ID: {comp_id})")
                
                # Calculate scores
                d_score = int(target.get("adoptionDepthScore", 3))
                r_score = int(target.get("roiPressureScore", 3))
                e_score = int(target.get("execVisibilityScore", 3))
                t_score = int(target.get("timelinessScore", 3))
                p_score = int(target.get("productRelevanceScore", 3))
                total_score = d_score + r_score + e_score + t_score + p_score
                
                # Build company object
                comp_obj = {
                    "id": comp_id,
                    "company": company_name,
                    "industry": target.get("industry", "Technology"),
                    "publicEvidence": target.get("publicEvidence", ""),
                    "sourceUrl": target.get("sourceUrl", "#"),
                    "evidenceDate": target.get("evidenceDate", datetime.datetime.now().strftime("%Y-%m-%d")),
                    "intentSummary": target.get("publicEvidence")[:120] + "...",
                    "whyThisMatters": target.get("whyThisMatters", ""),
                    "adoptionDepthScore": d_score,
                    "roiPressureScore": r_score,
                    "execVisibilityScore": e_score,
                    "timelinessScore": t_score,
                    "productRelevanceScore": p_score,
                    "totalIntentScore": total_score,
                    "intentBand": "Very High Intent" if total_score >= 22 else "High Intent",
                    "recommendedTargets": target.get("recommendedTargets", "CTO"),
                    "bestInitialPersona": target.get("recommendedTargets", "CTO").split(",")[0],
                    "outreachAngle": target.get("outreachAngle", "Measuring engineering cycles to prove AI spend value."),
                    "status": "Immediate Outreach",
                    "notes": ""
                }
                
                active_companies[comp_id] = comp_obj
                
                # Build people objects
                for person in target.get("people", []):
                    p_name = person.get("name")
                    if not p_name:
                        continue
                        
                    p_obj = {
                        "companyId": comp_id,
                        "company": company_name,
                        "name": p_name,
                        "title": person.get("title", "Head of Engineering"),
                        "linkedinUrl": person.get("linkedinUrl", f"https://www.linkedin.com/search/results/people/?keywords={p_name.replace(' ', '%20')}%20{company_name.replace(' ', '%20')}"),
                        "whyThisPerson": person.get("whyThisPerson", ""),
                        "likelyPainTension": person.get("likelyPainTension", ""),
                        "seniorityType": person.get("seniorityType", "VP Engineering"),
                        "suggestedChannel": "LinkedIn",
                        "connectionNote": person.get("connectionNote", ""),
                        "firstDM": person.get("firstDM", ""),
                        "followUpDM": person.get("followUpDM", ""),
                        "confidenceScore": "4/5"
                    }
                    active_people[(comp_id, p_name)] = p_obj
                    
        except Exception as e:
            print(f"Error during GenAI web discovery: {e}. Preserving current database targets.")
    else:
        print("Notice: No GEMINI_API_KEY environment variable set or google-generativeai module missing.")
        print("Proceeding with pre-seeded outbound database.")

    # 3. Merge active dataset with user-customized fields (e.g. status, notes, edits)
    final_companies = []
    for cid, comp in active_companies.items():
        comp_copy = comp.copy()
        # Restore user status/notes if they existed in the loaded results.json
        comp_copy["status"] = status_map.get(cid, comp.get("status", "Immediate Outreach"))
        comp_copy["notes"] = notes_map.get(cid, comp.get("notes", ""))
        comp_copy["lastUpdated"] = datetime.datetime.now().isoformat()
        final_companies.append(comp_copy)
        
    final_people = []
    for (cid, p_name), person in active_people.items():
        person_copy = person.copy()
        # Restore user edited connectionNote, firstDM, followUpDM, and linkedinUrl if they existed
        for field in ["connectionNote", "firstDM", "followUpDM", "linkedinUrl"]:
            key = (cid, p_name, field)
            if key in people_templates_map:
                person_copy[field] = people_templates_map[key]
        final_people.append(person_copy)
        
    # Sort companies by total intent score descending
    final_companies.sort(key=lambda x: x.get("totalIntentScore", 0), reverse=True)
        
    results = {
        "companies": final_companies,
        "people": final_people,
        "lastRunTimestamp": datetime.datetime.now().isoformat()
    }
    
    # Write to JSON
    with open(RESULTS_FILE, "w") as f:
        json.dump(results, f, indent=2)
        
    print(f"[{datetime.datetime.now().isoformat()}] Automation Run Completed successfully! Results written to: {RESULTS_FILE}")

if __name__ == "__main__":
    run_agent()
