<div align="center">

  <img
    src="https://capsule-render.vercel.app/api?type=waving&height=260&color=0:07111F,45:123B4A,100:0D9488&text=CitySutra%20AI&fontColor=FFFFFF&fontSize=64&fontAlignY=36&desc=THE%20URBAN%20CLIMATE%20ACTION%20TWIN&descAlignY=57&descSize=17&animation=fadeIn"
    width="100%"
    alt="CitySutra AI — The Urban Climate Action Twin"
  />

  <h3>Turning Urban Environmental Data into Actionable Civic Intelligence</h3>

  <p>
    <strong>One evidence layer. One prioritization engine. One accountable action workflow.</strong>
  </p>

  <p>
    An AI-assisted urban intelligence platform designed to help cities
    understand environmental risks, prioritize civic interventions, and
    make data-driven decisions.
  </p>

  <br />

  <a href="https://citysutra.vercel.app/">
    <img
      src="https://img.shields.io/badge/EXPLORE%20LIVE%20DEMO-14B8A6?style=for-the-badge&logo=vercel&logoColor=white"
      alt="Explore Live Demo"
    />
  </a>

  <a href="https://github.com/Ansh-vibe/citysutra-ai">
    <img
      src="https://img.shields.io/badge/VIEW%20SOURCE-GitHub-181717?style=for-the-badge&logo=github&logoColor=white"
      alt="View Source Code"
    />
  </a>

  <br /><br />

  <img src="https://img.shields.io/badge/Next.js-16-000000?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-087EA4?style=flat-square&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AWS-Serverless-FF9900?style=flat-square&logo=amazonaws&logoColor=white" alt="AWS" />
  <img src="https://img.shields.io/badge/Status-Prototype-0D9488?style=flat-square" alt="Prototype" />

</div>

<br />

## 🌍 The Problem

Cities generate enormous amounts of environmental, weather, geographic,
and civic information. Yet these signals are often fragmented across
different systems, making it difficult to understand how risks interact
and which intervention should happen first.

A blocked drain before heavy rain, a heatwave combined with a water
shortage, or a waste-burning report alongside elevated air pollution
can demand a more urgent response than any individual signal suggests.

**CitySutra AI brings these signals together into an explainable civic
decision-support workflow.**

Instead of presenting disconnected charts and alerts, the platform helps
operators understand:

- **What is happening?** Examine available environmental signals and
  reported civic incidents.
- **Where is it happening?** Explore location-based risks and incidents
  through an interactive map.
- **What should happen next?** Review recommendations ranked by a
  transparent Civic Action Priority score.
- **Why is it important?** Inspect supporting evidence, contributing
  factors, missing data, assumptions, and suggested next steps.
- **What could improve?** Explore illustrative scenarios for waste
  diversion, collection efficiency, water recovery, and energy.

The goal is to help cities move from fragmented monitoring to
**proactive, evidence-led urban operations.**

---

## ✨ Key Features

### 1. Unified Environmental Intelligence

CitySutra AI brings together four scoring dimensions across three
environmental and civic tracks.

| Dimension | Track | What It Represents |
|---|---|---|
| **A — Air** | Air | Provider-sourced air-quality indicators |
| **H — Heat** | Heat & Water | Apparent temperature and heat exposure signals |
| **W — Water** | Heat & Water | Rainfall pressure and water-related incidents |
| **G — Ground** | Waste & Energy | Waste-related incident pressure and collection issues |

The dimensions are combined into a shared view of urban conditions.

Values are labeled according to their source and methodology. Weather-grid
estimates are not represented as street-level sensor readings, and
provider AQI values are not mislabeled as India's official CPCB National
AQI.

### 2. Civic Action Priority Engine

CitySutra AI calculates a transparent priority score from **0 to 100**
using weighted environmental dimensions and configurable interaction
rules.

Default dimension weights:

| Dimension | Default Weight |
|---|---:|
| Air | 30% |
| Heat | 25% |
| Water | 20% |
| Ground / Waste | 25% |

The scoring engine renormalizes weights when certain dimensions are
unavailable. If there is insufficient evidence to calculate a meaningful
score, the system can explicitly report insufficient data instead of
presenting a misleading zero.

The platform also evaluates cross-track interactions, including:

- Open-burning reports combined with elevated air-quality indicators.
- Blocked drains or waterlogging combined with forecast rainfall.
- Heat stress combined with an active water-related issue.
- Waste pressure combined with collection-related incidents.

These interactions can increase an action's priority according to the
configured rules.

Every recommendation is intended to explain its contributing factors,
assumptions, available evidence, missing information, and next step.

### 3. Interactive City Map

Explore geographic context and incident locations through an
interactive map powered by Leaflet and OpenStreetMap.

Map capabilities include:

- Track and incident-status filters.
- Demo-record filtering.
- Location selection when creating a civic report.
- Incident detail panels and supporting context.
- A clear distinction between modeled geographic context and measured
  local conditions.

### 4. Civic Incident Management

Report and manage urban issues through a structured incident workflow.

Supported categories include:

- Air pollution and smoke observations.
- Open waste burning.
- Overflowing bins and missed collections.
- Waste accumulation and mixed-waste handling.
- Water leakage and waterlogging.
- Blocked drains and potential flooding.
- Heat-related infrastructure and missing cooling or water resources.

Incident lifecycle:

`Reported → Reviewed → Assigned → Resolved`

Incidents may also be rejected with a reason, subject to the permitted
lifecycle transitions.

Inputs are validated before processing, and incident updates are
reflected in the application's operational workflow.

**Important:** Updating a record changes the application's incident
state. It does not physically resolve a civic issue or notify a
government authority.

### 5. Prioritized Action Queue

The Actions workspace translates risk indicators and incidents into an
ordered response queue.

Each recommendation can expose:

- Priority score and contributing dimensions.
- Triggered interaction rules.
- Evidence and source context.
- Missing information and assumptions.
- Suggested owner and next step.
- Operator decisions such as accepting or dismissing an action.

These decisions are recorded in the application workflow; they do not
automatically dispatch field teams.

### 6. Environmental Impact Studio

Explore illustrative scenarios for:

- Waste diversion.
- Collection-route efficiency.
- Water recovery.
- Optional energy-related assumptions.

The calculator exposes formulas, units, assumptions, and sensitivity
ranges so users can see how changing an input affects the result.

**Scenario outputs are estimates, not measured environmental outcomes.**
Results depend on the input assumptions and available information.

### 7. Transparent Methodology

The Methodology workspace documents the logic behind the platform's
outputs, including:

- Data sources and source limitations.
- Dimension definitions and transformations.
- Default weights and configurable thresholds.
- Interaction rules and priority bonuses.
- Calculation assumptions.
- Known limitations and interpretation guidance.

The objective is not simply to generate a score, but to make the score
understandable and reviewable by a human operator.

### 8. AI-Assisted Explanations

The platform includes an explanation endpoint that can use Amazon
Bedrock when configured, with a deterministic explanation template as
the alternative.

The deterministic priority engine remains the source of truth.
Generated explanations are advisory and should not override the
underlying score, evidence, or human review.

Amazon Bedrock is optional and is not assumed to be enabled in the
public demo.

---

## 🖥️ Explore the Platform

| Workspace | Route | Purpose |
|---|---|---|
| Overview | `/` | Environmental indicators, priority score, current incidents and top actions |
| Map | `/map` | Geographic exploration and incident filtering |
| Actions | `/actions` | Prioritized recommendations and operator decisions |
| Report | `/report` | Submit and validate a civic incident |
| Incidents | `/incidents` | Review, filter, and manage incident lifecycles |
| Impact Studio | `/impact` | Explore illustrative intervention scenarios |
| Methodology | `/methodology` | Understand calculations, sources, assumptions, and limitations |

**Live application:** https://citysutra.vercel.app/

The public deployment is a prototype. Some records and scenarios are
simulated, and the application explicitly labels demo data when used.
Actual screens and available data can vary with source availability
and deployment configuration.

---

## 🏗️ Architecture

CitySutra AI separates the user interface, API handlers, data providers,
prioritization engine, and persistence layer.

### Application Architecture

```mermaid
flowchart TB
    U["City Operator"] --> UI["Next.js App Router<br/>React + TypeScript"]

    UI --> API["Next.js API Routes"]

    API --> AIR["Open-Meteo<br/>Air Quality API"]
    API --> WX["Open-Meteo<br/>Weather Forecast API"]

    API --> ENGINE["Deterministic<br/>Risk & Priority Engine"]

    ENGINE --> RULES["Interaction Rules<br/>& Recommendations"]
    ENGINE --> METHOD["Transparent<br/>Methodology"]

    API --> REPO["Repository Abstraction"]

    REPO --> PG["PostgreSQL<br/>Drizzle ORM"]
    REPO --> DDB["Amazon DynamoDB<br/>AWS Persistent Mode"]

    UI --> MAP["Leaflet<br/>OpenStreetMap"]
    UI --> CHART["Recharts<br/>Data Visualizations"]

    ENGINE --> ACTIONS["Ranked Civic Actions"]
    ACTIONS --> REVIEW["Human Review<br/>& Incident Workflow"]
```

The repository supports local PostgreSQL persistence and an AWS-backed
DynamoDB repository mode. The live Vercel demo may run in demo/fallback
mode; the presence of AWS deployment code does not imply that every
public-demo operation is writing to AWS.

### Optional AWS Serverless Backend

The repository also includes an AWS SAM template for a serverless
backend.

```mermaid
flowchart TB
    CLIENT["Authorized Application Client"]

    CLIENT --> GW["Amazon API Gateway<br/>HTTP API"]

    GW --> LAMBDA["AWS Lambda<br/>Node.js"]

    LAMBDA --> DDB["Amazon DynamoDB<br/>Incidents & Alerts"]

    LAMBDA --> S3["Amazon S3<br/>Evidence & Files"]

    LAMBDA --> CW["Amazon CloudWatch<br/>Logs & Metrics"]

    LAMBDA -. Optional explanation .-> BEDROCK["Amazon Bedrock"]

    DDB --> INDEX["Status Index<br/>for Incident Queries"]
```

The AWS resources are defined in:

`citysutra-ai-platform-development/aws/template.yaml`

This deployment path includes serverless request handling, persistent
incident and alert records, private evidence storage, request
throttling, and operational logging.

Review the deployment settings, access policies, costs, and required
permissions before provisioning cloud resources.

---

## 🧰 Technology Stack

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 16 | Application framework and API routes |
| React 19 | Component-based user interface |
| TypeScript | Type-safe application development |
| Tailwind CSS 4 | Responsive interface styling |
| Recharts | Charts and data visualizations |
| Leaflet | Interactive maps |
| OpenStreetMap | Geographic map data |
| Lucide React | Interface icons |
| Zod | Input and request validation |

### Data & Backend

| Technology | Purpose |
|---|---|
| Node.js | Application and serverless runtime |
| PostgreSQL | Local or non-AWS persistent storage |
| Drizzle ORM | PostgreSQL data access |
| Amazon DynamoDB | Optional AWS-backed incident and alert persistence |
| Open-Meteo | Air-quality and weather data |
| Vitest | Unit testing |
| ESLint | Code linting |
| TypeScript Compiler | Static type checking |

### AWS Infrastructure

| AWS Service / Tool | Role |
|---|---|
| Amazon API Gateway | HTTP API entry point for the optional serverless backend |
| AWS Lambda | Serverless request processing and risk analysis |
| Amazon DynamoDB | Persistent incident, action, and alert records |
| Amazon S3 | Private evidence and file storage |
| Amazon CloudWatch | Logs, metrics, and operational dashboard |
| Amazon Bedrock | Optional natural-language action explanations |
| AWS SDK for JavaScript v3 | Programmatic AWS service integration |
| AWS Serverless Application Model (SAM) | Infrastructure as code and serverless deployment |

Amazon Bedrock is optional. The application can use a deterministic
explanation template when Bedrock is disabled.

---

## 🧮 How the Priority Engine Works

CitySutra AI uses a deterministic, configurable model to combine
environmental dimensions with cross-track interactions.

The weighted base score is calculated from available dimensions:

\[
B = \sum_{i \in A} \frac{w_i}{\sum_{j \in A} w_j}v_i
\]

Where:

- \(A\) is the set of available dimensions.
- \(w_i\) is the configured weight for a dimension.
- \(v_i\) is the normalized dimension value.
- Missing dimensions are excluded from the denominator and the
  remaining weights are renormalized.

Triggered interaction rules can contribute additional bonuses.
The score is bounded to the configured 0–100 range.

Conceptually:

\[
P = \min\left(100,\ B+\sum_k b_k\right)
\]

Where \(b_k\) represents a triggered rule bonus.

The engine does not assume that all available environmental information
is equally reliable. Source limitations, missing dimensions, and
configurable assumptions should remain visible to the operator.

### Current Modeling Limitations

- Weather and air-quality grid products are area-scale estimates,
  approximately 15–25 km in resolution, rather than street-level
  environmental sensor measurements.
- Provider AQI standards must not be confused with India's official
  CPCB National AQI.
- Waste pressure is currently derived from reported incidents and
  represents a proxy, not a city-wide waste survey.
- Heat and rainfall thresholds are configurable operational
  assumptions, not official government warnings.
- Impact calculations use illustrative, editable assumptions rather
  than directly measured outcomes.

These limitations are part of the model's methodology, not details to
hide from the user.

---

## 🚀 Getting Started

You can run the application locally for development, testing, and
experimentation.

### Prerequisites

- Node.js 20 or later.
- npm.
- A PostgreSQL instance for local persistent storage.
- Git.

For the optional AWS-backed configuration, you will also need an
appropriately configured AWS account, AWS credentials or runtime role,
and AWS SAM CLI.

### 1. Clone the Repository

```bash
git clone https://github.com/Ansh-vibe/citysutra-ai.git

cd citysutra-ai/citysutra-ai-platform-development
```

The application source code is located inside
`citysutra-ai-platform-development/`.

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the application directory.

Example for local development:

```dotenv
# Required: PostgreSQL connection string
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE

# Local PostgreSQL repository
REPO_MODE=local

# Used for application URL / CORS configuration where applicable
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Replace the database placeholders with your own PostgreSQL credentials
and database name.

For AWS-backed persistence, configure the relevant runtime variables
in accordance with your deployment:

```dotenv
REPO_MODE=dynamodb
DYNAMO_TABLE=citysutra-dev
AWS_REGION=ap-south-1
```

For optional Bedrock explanations, configure the appropriate model ID
and enable the feature only after setting up the necessary AWS
permissions:

```dotenv
BEDROCK_ENABLED=true
BEDROCK_MODEL_ID=YOUR_ENABLED_BEDROCK_MODEL_ID
```

Do not commit real credentials, access keys, database passwords, or
other secrets. Keep private values in local environment files or a
secure deployment secret manager.

### 4. Prepare the Database

Ensure your PostgreSQL database exists, then run the project's Drizzle
schema synchronization command:

```bash
npx drizzle-kit push
```

### 5. Start the Development Server

```bash
npm run dev
```

Open:

**http://localhost:3000**

The first API request can initialize the labeled demo incident dataset
when the configured repository is empty.

Use the demo-reset control to restore the reproducible scenario when
testing workflows.

---

## 🧪 Testing & Code Quality

The project provides scripts for building, linting, and type checking,
along with Vitest-based tests.

Run the tests:

```bash
npx vitest run
```

Run ESLint:

```bash
npm run lint
```

Check TypeScript:

```bash
npm run typecheck
```

Build the application:

```bash
npm run build
```

These commands help verify the deterministic scoring logic, input
validation, impact calculations, and application build.

---

## ☁️ AWS Deployment

The application source includes an AWS SAM template for the optional
serverless backend.

**Important:** AWS deployment creates cloud resources that can incur
charges. Review the configuration and estimated costs before
provisioning anything.

### 1. Install and Configure AWS Tools

Install the AWS CLI and AWS SAM CLI, configure your AWS credentials
or deployment role, and select the intended AWS Region.

### 2. Build the Serverless Backend

From the application directory:

```bash
cd aws/lambda

npm install --omit=dev

cd ..

sam build -t template.yaml
```

### 3. Deploy the AWS Stack

Set the allowed frontend origin to the URL from which your application
will call the backend.

For the public Vercel deployment:

```bash
sam deploy --guided \
  --parameter-overrides \
  Env=dev \
  AllowedOrigin=https://citysutra.vercel.app
```

Follow the prompts to configure the deployment and review the changes
before allowing resources to be created.

The template defines the API endpoint, DynamoDB table, private evidence
bucket, and CloudWatch dashboard.

### 4. Configure the Application

Use the stack outputs and the repository's environment configuration
to connect the application to the deployed backend.

For DynamoDB persistence, configure:

```dotenv
REPO_MODE=dynamodb
DYNAMO_TABLE=citysutra-dev
AWS_REGION=ap-south-1
```

The runtime must have the permissions required to access the selected
DynamoDB table and any other AWS services that are enabled.

For Bedrock explanations, use a supported model available to your AWS
account, set the model identifier, and grant only the necessary
inference permission.

### 5. Production Readiness

Before using the platform beyond a prototype, review authentication,
authorization, incident ownership, rate limiting, logging, data
retention, privacy, resource costs, and operational recovery.

The public Vercel demo and the optional AWS backend are distinct
deployment configurations. Deploying the AWS template alone does not
automatically migrate the live Vercel application or its current demo
records to AWS.

---

## 🔌 API Overview

The Next.js application exposes same-origin API routes for retrieving
environmental snapshots, managing incidents, recording action
decisions, and inspecting methodology.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Check application and repository health |
| `/api/snapshot` | GET | Retrieve a combined cross-track risk snapshot |
| `/api/incidents` | GET | List incidents with supported filters |
| `/api/incidents` | POST | Validate and create an incident |
| `/api/incidents/{id}` | GET | Retrieve an individual incident |
| `/api/incidents/{id}` | PATCH | Update an incident's permitted lifecycle state |
| `/api/actions` | GET | Retrieve ranked recommendations and their recorded statuses |
| `/api/actions/{id}` | PATCH | Record an operator's action decision |
| `/api/providers/air` | GET | Retrieve air-quality provider information |
| `/api/providers/weather` | GET | Retrieve weather provider information |
| `/api/methodology` | GET | Retrieve scoring rules, weights, and sources |
| `/api/demo/reset` | POST | Reset the reproducible demo dataset |
| `/api/explain` | POST | Generate an advisory explanation for a prioritized action |

The separate AWS Lambda API also defines endpoints for health checks,
incident operations, risk snapshots, and evidence uploads.

Check the corresponding route handlers and AWS deployment template for
the exact payload schemas, validation rules, response codes, and
deployment-specific endpoints.

---

## 🔐 Security & Responsible Use

CitySutra AI is intended as a decision-support prototype, not an
autonomous emergency-response system.

The implementation includes input validation, origin checks,
throttling on applicable mutating routes, and a server-side AWS
integration model.

The AWS deployment template also defines private S3 storage with
server-side encryption, blocked public bucket access, an evidence
lifecycle policy, request throttling, and CloudWatch logging.

Before deploying outside a controlled prototype environment:

- Keep AWS credentials and private configuration out of client-side
  code.
- Apply least-privilege IAM policies and verify the actual permissions
  required by each runtime.
- Configure appropriate authentication and operator authorization.
- Validate data provenance, source freshness, and the interpretation of
  environmental indicators.
- Define clear retention and access policies for any uploaded evidence.
- Avoid storing sensitive personal information unnecessarily.
- Keep a human decision-maker responsible for evaluating
  recommendations and taking real-world action.

**No government authority is automatically notified, and field teams
are not automatically dispatched by the public demo.**

---

## 🎯 Example Demonstration Workflow

A reproducible demonstration can illustrate how the platform connects
environmental indicators with civic actions.

1. Open the Overview dashboard and examine the available indicators,
   source labels, priority score, and active incidents.
2. Review a simulated smoke or waste-burning report alongside the
   available air-quality signal.
3. Open the Map workspace to explore the location and supporting
   context.
4. Inspect the recommendation generated by the priority engine.
5. Submit a test incident through the Report workspace.
6. Open Incidents and review the permitted lifecycle transitions.
7. Visit Actions to inspect the explanation and record an operator
   decision.
8. Open Impact Studio and change scenario assumptions to observe how
   the estimates change.
9. Finish at Methodology to inspect the rules and limitations behind
   the displayed outputs.

Demo records should remain identifiable as simulated. Changing an
incident or score during this demonstration does not change actual
pollution, weather, water conditions, or municipal operations.

---

## 🛣️ Future Scope

Potential future improvements include:

- Integration with verified, official environmental monitoring
  stations and additional trusted civic data sources.
- More granular, validated neighborhood-level risk assessments.
- Authenticated multi-operator workspaces and role-based access control.
- Better incident ownership, assignment, and audit history.
- Additional municipal-system integrations where authorized.
- Improved forecast evaluation and data-quality monitoring.
- Documented evaluation datasets for the scoring and recommendation
  engine.
- Expanded impact modeling with locally validated environmental and
  economic assumptions.
- Production-grade observability, resilience, and deployment automation.

These are potential directions for future development, not claims about
functionality already implemented in the current prototype.

---

## 📚 Data Sources & Attribution

CitySutra AI uses or supports the following data resources:

- **Open-Meteo Air Quality API:**  
  https://open-meteo.com/en/docs/air-quality-api

- **Open-Meteo Weather APIs:**  
  https://open-meteo.com/en/docs

- **OpenStreetMap:**  
  https://www.openstreetmap.org/copyright

- **Central Pollution Control Board — AQI documentation:**  
  https://airquality.cpcb.gov.in/ccr_docs/About_AQI.pdf

Source availability, licensing requirements, coverage, spatial
resolution, and data standards should be verified before using outputs
for operational decisions.

---

## 🤝 Contributing

Contributions, bug reports, and ideas for improving CitySutra AI are
welcome.

A useful contribution should include:

1. A clear problem statement or reproducible issue.
2. The proposed change and its expected impact.
3. Tests or validation evidence where applicable.
4. Any relevant assumptions, limitations, or changes to the
   methodology.

For changes to risk scoring, thresholds, or environmental data
interpretation, document the reasoning so that the resulting behavior
remains transparent and reviewable.

Repository:
https://github.com/Ansh-vibe/citysutra-ai

---

## 👨‍💻 Project

**CitySutra AI — The Urban Climate Action Twin**

Built as a prototype exploring how environmental data, deterministic
risk analysis, explainable recommendations, geospatial interfaces,
and cloud infrastructure can support better urban decision-making.

- **Live Demo:** https://citysutra-ai.vercel.app/
- **GitHub Repository:** https://github.com/Ansh-vibe/citysutra-ai
- **Application Source:** [`citysutra-ai-platform-development/`](./citysutra-ai-platform-development)

---

<div align="center">

  <h3>Better Evidence. Smarter Priorities. More Resilient Cities.</h3>

  <p>
    <em>
      CitySutra AI — Making the next civic action legible.
    </em>
  </p>

  <sub>
    Prototype · Human-reviewed decisions · Explainable risk scoring
  </sub>

</div>
