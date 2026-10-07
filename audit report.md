
# Technical Audit Report: Input → Processing → Output Architecture

**System:** RCY Recovery Manager (Operations Center & Evidence-Grounded Financial Claims Engine)  
**Workspace:** `cube-05-recovery-manager-saif-8671`  
**Audit Date:** October 7, 2026  
**Audit Scope:** Read-only inspection of frontend (`Next.js`), backend (`FastAPI`), database models (`SQLAlchemy`), parsing engines (`Pandas`/`PyPDF`), retrieval/matching systems, and agent reasoning pipelines.  
**Files Modified:** **NONE** (0 files modified)

---

## 1. Executive Summary

Recovery Manager is an automated audit and dispute engine designed to detect, substantiate, and recover invalid eCommerce marketplace deductions (such as Amazon FBA inbound defect fees, lost inventory adjustments, and unreturned customer refunds). 

The application operates as an **asymmetric fact verification engine**:
1. **Input:** Accepts financial fee deduction reports and upstream physical warehouse operational logs (via bulk file upload of CSV, Excel, JSON, and PDF documents, or manual single-entry forms).
2. **Processing:** Normalizes and deduplicates financial transactions and physical custody events; executes a 5-hop structured and semantic retrieval pipeline across identifiers (`unit_id`, `shipment_id`, `order_id`, `sku`) and text embeddings; executes a deterministic multi-stage forensic rule hierarchy (with a fallback Gemini 2.5 Flash / local NLP agent layer) to assign conservative audit verdicts; and enforces ledger double-claim locks.
3. **Output:** Produces itemized investigation verdicts (`CONTRADICTED`, `SUPPORTED`, `SILENT`, `UNCERTAIN`, `DUPLICATE`, `ALREADY_REIMBURSED`), forensic proof boundaries (*What evidence establishes vs. What it does not establish*), chronological unit lifecycles, interactive graph traversals, frozen audit packets, and multi-format commercial dispute dossiers (JSON, printable HTML/PDF, copyable plain-text dispute letters).

---

## 2. Supported Input Types

Inspected from [`backend/app/ingestion/parsers.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py#L45-L76) and [`frontend/app/data-sources/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/data-sources/page.jsx#L508-L524):

| Input Type | File Extension | Accepted? | Processing Method | Output |
|---|---|---|---|---|
| **CSV** | `.csv` | **YES** | Read via `pd.read_csv(io.BytesIO(file_content))` in `IngestionParser.parse_file_to_dataframe`. | `pd.DataFrame` transformed into `Charge`, `EvidenceRecord`, `Shipment`, and `Order` SQL entities. |
| **Excel (Modern)** | `.xlsx` | **YES** | Read via `pd.read_excel(io.BytesIO(file_content))` using `openpyxl`. | `pd.DataFrame` transformed into domain entities. |
| **Excel (Legacy)** | `.xls` | **YES** | Read via `pd.read_excel(io.BytesIO(file_content))`. | `pd.DataFrame` transformed into domain entities. |
| **JSON** | `.json` | **YES** | Decoded with `json.loads`. Unwraps top-level arrays or dicts containing keys: `records`, `items`, `data`, `rows`. | `pd.DataFrame` transformed into domain entities. |
| **PDF** | `.pdf` | **YES** *(Conditional)* | Parsed using `pypdf.PdfReader` if installed. Iterates pages and extracts non-empty lines into a single column `raw_line`. Raises `ValueError` if `pypdf` is missing. | `pd.DataFrame` with column `raw_line`. Note: Does not map into specific entities unless table structure matches. |

---

## 3. Input File Schemas: Expected Columns & Data Types

The file type classification is determined by `IngestionParser.detect_file_type` using filename substring matching or column inspection:
- `fee_report`: Filename contains `fee`, `reimbursement`, `charge` OR columns contain `charge_type`, `amount_usd`, `line_id`.
- `receiving`: Filename contains `receiv`, `rcv` OR columns contain `cartons_received`, `carton_damage`.
- `prep`: Filename contains `prep`, `prp` OR columns contain `polybag_present_sealed`, `prep_price_usd`.
- `pack`: Filename contains `pack`, `pck` OR columns contain `operator_verdict`, `observed_in_box`.
- `returns`: Filename contains `return`, `rtn` OR columns contain `operator_disposition`, `observed_state`.

### 3.1. Marketplace / Financial Data (`fee_report`)

Inspected from [`IngestionParser.validate_and_preview`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py#L101-L110) and [`IngestionParser.transform_to_entities`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py#L157-L200):

| Field Name | Recognized Aliases | Required? | Optional? | Data Type | Used For | Example |
|---|---|---|---|---|---|---|
| `amount_usd` | `amount`, `Amount`, `fee_amount` | **REQUIRED** *(Validation fails preview without it)* | No | Float / Numeric | Fee amount disputed; bounds max claim recovery | `4.25` |
| `charge_type` | `reason`, `Reason`, `charge_reason` | **REQUIRED** *(Validation fails preview without it)* | No | String | Core deduction allegation driving retrieval & rules | `inbound_defect_fee` |
| `line_id` | `charge_id` | Optional *(Defaults to `CH-{row_idx}`)* | Yes | String | Unique primary identifier for charge and deduplication | `FEE-0014-1` |
| `unit_id` | - | Optional | Yes | String | Physical item identifier; primary hop in matching | `UNIT-0014` |
| `fba_shipment_id` | `shipment_id` | Optional | Yes | String | Inbound shipment / container ID; hops 2 & 4 | `FBA-DUMMY-101` |
| `order_id` | - | Optional | Yes | String | Customer order reference; hop 3 | `ORD-DUMMY-50014` |
| `sku` | - | Optional | Yes | String | Seller catalog SKU; hop 3 context & query embedding | `SKU-LAMP-LED` |
| `fnsku` | - | Optional | Yes | String | Amazon fulfillment SKU stored in database record | `X00DUMMY014` |
| `posted_date` | `charge_date` | Optional | Yes | String (ISO / YYYY-MM-DD) | Transaction timestamp in timeline & duplicate checks | `2026-07-18` |
| `org_id` | - | Optional *(Overrides company_id if present)* | Yes | String | Workspace tenancy routing | `org_demo_alpha` |
| `report_type` | - | Optional | Yes | String | Ignored by parser | `fee_report` |
| `quantity` | - | Optional | Yes | Integer | Ignored by parser (defaults quantity to 1 in ledger) | `1` |

---

## 4. Operational / Evidence Inputs

Inspected from [`IngestionParser.transform_to_entities`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py#L201-L346):

### 4.1. Receiving Evidence (`receiving`)
| Field Name | Required? | Data Type | Default / Fallback | Used For | Example |
|---|---|---|---|---|---|
| `record_id` | Optional | String | `RCV-{row_idx}` | Primary key `evidence_id` | `RCV-0001` |
| `unit_id` | Optional | String | `None` | Unit-level matching hop | `UNIT-0001` |
| `po_number` | Optional | String | `None` | Stored in `EvidenceRecord.shipment_id` | `PO-7000` |
| `sku` | Optional | String | `None` | Catalog matching context | `SKU-TOWEL-BLU` |
| `carton_damage` | Optional | String | `"none"` | Evaluates finding: `"none"` vs `"crushing"` | `none` |
| `unit_damage` | Optional | String | `"none"` | If not `"none"`, finding becomes `DAMAGED` or `UNCERTAIN` | `none` |
| `qty_ordered` | Optional | Integer / Float | `None` | Shortage check: If `qty_received < qty_ordered`, finding = `SHORTAGE` | `24` |
| `qty_received` | Optional | Integer / Float | `None` | Intake verification | `24` |
| `cartons_received` / `cartons_ordered` | Optional | String / Int | `None` | Interpolated into narrative description | `1` / `1` |
| `photo_refs` | Optional | String | `""` | Semi-colon separated photo paths | `fixtures/receiving/UNIT-0001_pallet.jpg` |
| `operator_id` | Optional | String | `""` | Floor auditor tracking | `op_eli` |
| `captured_at` | Optional | String (ISO) | `""` | Timestamp for chronological timeline | `2026-06-04T17:32:00Z` |
| `org_id` | Optional | String | Target company | Workspace isolation | `org_demo_alpha` |

### 4.2. Prep Station Compliance Evidence (`prep`)
| Field Name | Required? | Data Type | Default / Fallback | Used For | Example |
|---|---|---|---|---|---|
| `record_id` | Optional | String | `PRP-{row_idx}` | Primary key `evidence_id` | `PRP-0002` |
| `unit_id` | Optional | String | `None` | Direct unit matching hop | `UNIT-0002` |
| `fba_shipment_id` | Optional | String | `None` | Stored in `EvidenceRecord.shipment_id` | `FBA-DUMMY-100` |
| `sku` | Optional | String | `None` | SKU-level context | `SKU-CANDLE-3` |
| `polybag_present_sealed`| Optional | String | `"not_required"` | Rule trigger: `"not_sealed"` sets finding `FAIL`; `"uncertain"` sets `UNCERTAIN` | `yes` |
| `original_barcode_covered`| Optional | String | `"not_required"` | Rule trigger: `"no"` sets finding `FAIL` | `yes` |
| `fnsku_label_placement`| Optional | String | `"flat"` | Label compliance check (`flat`, `on_seam`) | `flat` |
| `suffocation_warning` | Optional | String | `"not_required"` | Label compliance text | `legible` |
| `handling_marks` | Optional | String | `"not_required"` | `"some_missing"` sets finding `FAIL` | `all_present` |
| `photo_refs` | Optional | String | `""` | Photo links | `fixtures/prep/UNIT-0002_label.jpg` |
| `operator_id` | Optional | String | `""` | Operator ID | `op_amira` |
| `captured_at` | Optional | String (ISO) | `""` | Timeline sorting | `2026-06-04T12:25:00Z` |

### 4.3. Pack Bench Verification Evidence (`pack`)
| Field Name | Required? | Data Type | Default / Fallback | Used For | Example |
|---|---|---|---|---|---|
| `record_id` | Optional | String | `PCK-{row_idx}` | Primary key `evidence_id` | `PCK-0006` |
| `unit_id` | Optional | String | `None` | Direct unit match hop | `UNIT-0006` |
| `order_id` | Optional | String | `None` | Order match hop | `ORD-DUMMY-50006` |
| `operator_verdict` | Optional | String | `"seal"` | Finding logic: `"seal"` → `PASS`; `"stop_and_fix"` → `FAIL`; otherwise `UNCERTAIN` | `seal` |
| `observed_in_box` | Optional | String | `""` | Verified box contents | `SKU-CABLE-USBC:1` |
| `order_lines` | Optional | String | `""` | Target order manifest | `SKU-CABLE-USBC:1` |
| `photo_refs` | Optional | String | `""` | Photo references | `fixtures/pack/UNIT-0006_open_box.jpg` |
| `operator_id` | Optional | String | `""` | Pack operator ID | `op_ben` |
| `captured_at` | Optional | String (ISO) | `""` | Timestamp | `2026-06-22T08:10:00Z` |

### 4.4. Customer Returns Evidence (`returns`)
| Field Name | Required? | Data Type | Default / Fallback | Used For | Example |
|---|---|---|---|---|---|
| `record_id` | Optional | String | `RTN-{row_idx}` | Primary key `evidence_id` | `RTN-0003` |
| `unit_id` | Optional | String | `None` | Unit match hop | `UNIT-0003` |
| `order_id` | Optional | String | `None` | Associated customer order | `ORD-DUMMY-50003` |
| `ordered_sku` | Optional | String | `None` | Mapped to `EvidenceRecord.sku` | `SKU-PUZZLE-500` |
| `operator_disposition` | Optional | String | `""` | Uppercased to form `finding` (`LIQUIDATE`, `RESTOCK`, etc.) | `liquidate` |
| `observed_state` | Optional | String | `""` | Unit condition description | `signs_of_use` |
| `parts_missing` | Optional | String | `""` | Missing component logs | `none` |
| `photo_refs` | Optional | String | `""` | Return condition photos | `fixtures/returns/UNIT-0003_1.jpg` |
| `operator_id` | Optional | String | `""` | Return desk operator | `op_chen` |
| `captured_at` | Optional | String (ISO) | `""` | Timestamp | `2026-07-10T15:54:00Z` |

---

## 5. Manual Inputs

Inspected from [`frontend/app/data-sources/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/data-sources/page.jsx#L895-L1148), [`backend/app/api/routes.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/api/routes.py#L84-L104), and [`backend/app/schemas/schemas.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/schemas/schemas.py#L35-L83):

### 5.1. Add Single Charge
- **UI Form Fields Displayed:** Charge ID, Unit ID, Shipment ID, Order ID, Catalog SKU, Amount ($ USD), Deduction Reason (Dropdown: `inbound_defect_fee`, `lost_inbound`, `refund_issued_item_not_returned`, `damaged_in_warehouse`, `fulfilment_fee_weight_tier`).
- **Fields Sent to Backend (`POST /api/v1/charges`):**
  ```json
  {
    "charge_id": "CHG-2026-99",
    "unit_id": "UNIT-0014",
    "shipment_id": "FBA-DUMMY-101",
    "order_id": "ORD-DUMMY-50014",
    "sku": "SKU-LAMP-LED",
    "reason": "inbound_defect_fee",
    "amount": 38.00,
    "currency": "USD",
    "charge_date": "2026-10-07",
    "company_id": "org_demo_alpha"
  }
  ```
- **Validation:** Frontend `required` on Charge ID and Amount. Pydantic `ChargeCreate` enforces `charge_id: str`, `reason: str`, `amount: float`, `company_id: str`.
- **Resulting Database Record:** A row in `charges` table with `status = "UNINVESTIGATED"`, `created_at = utcnow()`.

### 5.2. Add Single Evidence
- **UI Form Fields Displayed:** Evidence ID, Source Stage (Dropdown: `receiving`, `prep`, `pack`, `returns`), Unit ID, Finding Verdict (Dropdown: `PASS`, `FAIL`, `UNCERTAIN`, `RESTOCKED`, `DISPOSED`), Description / Operational Findings.
- **Fields Sent to Backend (`POST /api/v1/evidence`):**
  ```json
  {
    "evidence_id": "PRP-9912",
    "source_type": "prep",
    "unit_id": "UNIT-0014",
    "shipment_id": "",
    "order_id": "",
    "sku": "",
    "event_type": "fba_prep_compliance",
    "finding": "PASS",
    "description": "Polybag verified sealed airtight. Barcode covered.",
    "timestamp": "2026-10-07T14:57:00.000Z",
    "company_id": "org_demo_alpha"
  }
  ```
- **Validation:** Frontend `required` on Evidence ID, Source Stage, Finding Verdict, Description. Pydantic `EvidenceCreate` enforces `evidence_id: str`, `source_type: str`, `event_type: str`, `finding: str`, `company_id: str`.
- **Resulting Database Record:**
  1. Row in `evidence_records` table.
  2. If `description` is provided, automatically generates a 64-dimensional pseudo-semantic vector via `hybrid_retrieval_engine.get_embedding(description)` and writes a record into `evidence_chunks` for vector matching.

---

## 6. Upload Process Pipeline

The actual upload pipeline in code differs slightly from hypothetical models:

```
User selects file
       ↓
[Optional] Preview Endpoint (POST /api/v1/files/upload-preview)
       ├── File Parsing (pd.read_csv / pd.read_excel / json.loads / pypdf)
       ├── File Type Detection (filename heuristic + column scanning)
       ├── Sanitization (cleans NaNs/Infs to null for JSON compliance)
       └── Required Column Validation (returns sample_preview & errors)
       ↓
User clicks "Confirm & Ingest Data" (POST /api/v1/files/import)
       ↓
File Parsed to DataFrame (pd.read_csv / pd.read_excel / json.loads)
       ↓
Physical Storage (StorageService.save_file)
       ├── Saves to local tenant path: uploads/company_{company_id}/{file_type}/{filename}
       └── Uploads to Cloudinary (if API credentials exist in environment)
       ↓
Source File Metadata Created (SourceFile table record in DB)
       ↓
Entity Transformation (IngestionParser.transform_to_entities)
       ├── Maps DataFrame rows to Charge, EvidenceRecord, Shipment, Order
       └── Casts values, sanitizes NaN, applies defaults
       ↓
Deduplication & DB Commit:
       ├── Charges: checks Charge.charge_id against existing DB records; skips duplicates
       ├── Evidence: checks EvidenceRecord.evidence_id against DB; skips duplicates
       ├── Vector Chunking: inserts EvidenceChunk embeddings for new evidence descriptions
       └── Master entities: inserts Shipments and Orders
       ↓
Automatic Investigation Trigger (Only if added_charges > 0)
       └── Calls charge_service.run_batch_investigations(db, company_id)
       ↓
Response returned to frontend (counts of imported vs duplicate skipped)
```

- **Is Preview mandatory?** **Optional.** The user can trigger preview via file selection, but `POST /files/import` is self-contained and performs parsing and ingestion independently.
- **Where does each step live?**
  - Validation & Transformation: [`backend/app/ingestion/parsers.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py)
  - Storage: [`backend/app/storage/storage_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/storage/storage_service.py)
  - Route execution & deduplication: [`backend/app/api/routes.py:L296-L417`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/api/routes.py#L296-L417)

---

## 7. Data Transformation Logic

### 7.1. Sanitization & Normalization
- **String Cleaning:** `clean_str(val)` strips whitespace and converts empty strings or variations of `"nan"`, `"none"`, `"null"` to `None`.
- **JSON Compliance:** `clean_row_dict` converts all NaN and Inf float values into `None` before assigning to `raw_payload` or serializing preview responses.
- **Amounts:** Parsed as `float(row.get("amount_usd") or row.get("amount") or 0.0)`.

### 7.2. Entity Mapping & ID Generation
- **Charges:** `charge_id = row.get("line_id") or row.get("charge_id") or f"CH-{row_idx}"`. Status initialized to `"UNINVESTIGATED"`.
- **Evidence:** `evidence_id = row.get("record_id") or f"{PREFIX}-{row_idx}"` (where PREFIX is `RCV`, `PRP`, `PCK`, or `RTN`).
- **Master Entities:** Every charge with a `fba_shipment_id` generates a `Shipment` record; every charge with an `order_id` generates an `Order` record.

### 7.3. Source-Type Classification
`IngestionParser.detect_file_type` uses a 2-stage check:
1. Stage 1: Case-insensitive substring match against filename (`fee`, `reimbursement`, `charge` → `fee_report`; `receiv`, `rcv` → `receiving`; `prep`, `prp` → `prep`; `pack`, `pck` → `pack`; `return`, `rtn` → `returns`).
2. Stage 2: Column inspection fallback (e.g., presence of `polybag_present_sealed` classifies as `prep`).

---

## 8. Core Matching Logic: Financial Charges ↔ Operational Evidence

Inspected from [`HybridRetrievalEngine.retrieve_evidence_multi_hop`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/rag/retrieval.py#L40-L124):

The matching system links financial charges to operational evidence through a strict 5-hop retrieval engine:

| Charge Field | Evidence Field | Matching Hop | Exact Logic Implemented in Code |
|---|---|---|---|
| `charge.unit_id` | `evidence.unit_id` | **Hop 1 (Direct Unit Match)** | Queries `EvidenceRecord` where `company_id == charge.company_id` and `unit_id == charge.unit_id`. |
| `charge.shipment_id` | `evidence.shipment_id` | **Hop 2 (Shipment Inbound Match)** | Queries `EvidenceRecord` where `company_id == charge.company_id` and `shipment_id == charge.shipment_id`. Matches inbound prep records or PO receiving records. |
| `charge.order_id` | `evidence.order_id` | **Hop 3 (Customer Order Match)** | Queries `EvidenceRecord` where `company_id == charge.company_id` and `order_id == charge.order_id`. Matches pack sheets and return desk records. |
| `charge.order_id` | `evidence.unit_id` (via intermediary) | **Hop 4 (Relational Multi-Hop)** | If charge has `order_id` but no `unit_id`, queries `EvidenceRecord` with that `order_id` to locate the physical `unit_id` recorded at pack/returns. Then queries all other operational stages (`receiving`, `prep`) for that newly resolved `unit_id`. |
| `charge.reason` + `charge.sku` | `chunk.content` / `chunk.embedding` | **Hop 5 (Semantic Vector Search)** | Computes 64-dim normalized pseudo-semantic vector of query `"{charge.reason} {charge.sku}"`, queries up to 250 recent `EvidenceChunk` records, computes cosine similarity, and includes evidence items where `similarity >= 0.15`. |

### Unit-Level Isolation Rule
In [`HybridRetrievalEngine.analyze_evidence_relevance`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/rag/retrieval.py#L143-L160) and [`RecoveryAgent.investigate_charge:L164-L170`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/agents/recovery_agent.py#L164-L170):
If a charge specifies a `unit_id`, any retrieved evidence with a different `unit_id` is marked `CONTEXTUAL` and **filtered out** of relevant items. Defect compliance for unit A cannot be established by evidence from unit B.

---

## 9. Assessment / Verdict Logic

Inspected from [`RecoveryAgent.investigate_charge`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/agents/recovery_agent.py#L23-L446):

All verdicts are **real backend decisions computed by Python services**, persisted in SQLite/Neon, and returned via API. None are frontend-only mocks.

| Verdict | Trigger / Input Condition | Evidence Requirement | Output Fields | Next Action |
|---|---|---|---|---|
| **`DUPLICATE`** | Another charge exists in company with identical `amount`, `reason`, `charge_date`, and shared `unit_id`, `shipment_id`, or `order_id`. | No evidence required. | `claim_supported: false`<br>`claim_amount: 0.0`<br>`unsupported_reason: "Duplicate billing line flagged..."` | Skipped from recovery opportunities; prevents duplicate filing penalty. |
| **`ALREADY_REIMBURSED`** | An offsetting negative charge exists (`amount < 0`) with a reimbursement reason, OR `charge.unit_id` is already logged in `ClaimLedger` under another claim. | No evidence required. | `claim_supported: false`<br>`claim_amount: 0.0`<br>`unsupported_reason: "Already reimbursed..."` or `"Unit already claimed in previous dossier."` | Disallowed from recovery; protects seller account standing. |
| **`SILENT`** | No relevant operational evidence retrieved addressing the charge allegation (e.g., charge alleges unreturned item, but no return record found). | 0 relevant evidence items found. | `claim_supported: false`<br>`claim_amount: 0.0`<br>`coverage_summary.missing_items` populated. | Highlighted as Conservative Skip; user can view "Why Not Claim?" explanation. |
| **`UNCERTAIN`** | Operational logs retrieved, but finding is marked `UNCERTAIN` / `pending_review`, or logs show supplier receiving damage (e.g., carton crushed) that obscures carrier liability. | Relevant evidence exists, but condition at handover is ambiguous or incomplete. | `claim_supported: false`<br>`claim_amount: 0.0`<br>`unsupported_reason` explains ambiguity. | Conservative Skip; user can inspect citations and missing proof items. |
| **`SUPPORTED`** | Operational evidence substantiates that the seller caused the defect (e.g., prep inspection recorded `polybag == 'not_sealed'` or `barcode == 'no'`). | Relevant prep record with `FAIL` finding or defect flags. | `claim_supported: false`<br>`claim_amount: 0.0`<br>`reasoning` confirms legitimate fee. | Charge confirmed legitimate. Marked as non-recoverable. |
| **`CONTRADICTED`** | Operational evidence explicitly refutes the charge reason (e.g., fee alleges polybag defect, but prep inspection recorded `polybag == 'yes'` and `barcode == 'yes'`; or fee alleges lost inbound, but receiving & prep prove complete handover). | Relevant operational logs proving compliance prior to custody transfer. | `claim_supported: true`<br>`claim_amount: charge.amount`<br>`reasoning` cites evidence IDs. | Added to Recovery Pipeline. Enables "Generate Claim Package" action. |

---

## 10. Investigation / Forensic Reasoning Output

Inspected from [`frontend/app/investigations/[chargeId]/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/investigations/%5BchargeId%5D/page.jsx) and [`backend/app/services/investigation_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/investigation_service.py):

When navigating to `/investigations/[chargeId]`, the page fetches `GET /api/v1/investigations/{chargeId}`. Every field is generated via a clear pipeline:

| Investigation Field | Source | Processing | Output Type |
|---|---|---|---|
| `assessment` | `investigations.assessment` | Rule evaluation in `RecoveryAgent` / Gemini | String (`CONTRADICTED`, `SILENT`, etc.) |
| `claim_supported` | `investigations.claim_supported` | Evaluated true only if `CONTRADICTED` | Boolean (`true` / `false`) |
| `claim_amount` | `investigations.claim_amount` | Bound strictly by `charge.amount` | Float (`$0.00` or fee amount) |
| `reasoning` | `investigations.reasoning` | Synthesized forensic justification | Text paragraph |
| `unsupported_reason`| `investigations.unsupported_reason` | Conservative refusal rationale | Text string |
| `coverage_summary` | `investigations.coverage_summary` | Evaluated verified facts vs. missing facts | Dict (`verified_items`, `missing_items`, `why_not_claim`) |
| `evidence_items` | `investigation_evidence` + `hybrid_retrieval_engine` | Multi-hop query + relevance analysis | Array of objects with `establishes` and `does_not_establish` |
| `timeline` | `hybrid_retrieval_engine.build_chronological_timeline` | Merges operational events with financial charge terminal event, sorted by timestamp | Chronological event list |

---

## 11. Claim Output Workflow

Inspected from [`backend/app/services/claim_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/claim_service.py) and [`frontend/components/ClaimPackageModal.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/components/ClaimPackageModal.jsx):

```
Charge is evaluated as CONTRADICTED (claim_supported = true)
       ↓
User clicks "Generate Claim Package" in UI (or calls POST /api/v1/claims)
       ↓
ClaimService.generate_claim_package(db, company_id, charge_id)
       ├── Validates investigation.claim_supported is True (throws ValueError otherwise)
       ├── Generates claim_id: "CLM-" + charge_id sanitized
       ├── Builds immutable frozen audit_packet JSON snapshot:
       │     ├── charge_metadata (IDs, amount, currency, date, reason)
       │     ├── investigation (assessment, claim_amount, reasoning)
       │     ├── evidence_chain (itemized proof citations)
       │     └── legal_defense_statement (formal dispute paragraph)
       ├── Writes Claim entity to database (status = "DRAFT")
       ├── Updates Charge status to "CLAIMED"
       └── Writes entry to ClaimLedger (locks unit_id to prevent duplicate claims)
       ↓
ClaimPackageModal opens in UI
       ├── View 1: Formatted Dispute Letter & Side-by-Side Fact Table
       ├── View 2: Raw JSON Audit Packet Viewer
       ├── Action 1: "Copy Dispute Text" (copies plain text dispute letter)
       ├── Action 2: "Copy JSON" (copies audit packet payload)
       ├── Action 3: "Print / Save as PDF" (triggers browser print stylesheet)
       ├── Action 4: "Download Dispute Document" (generates client-side standalone .html file)
       └── Lifecycle Action: "Mark as SUBMITTED" / "Mark as PAID" (PATCH /api/v1/claims/{id}/status)
```

- **Automatic vs Manual:** Claims are **manually created by user action** (either from the Investigation page or by clicking "File Claim" in Recovery Pipeline).
- **Format Support:** Supports **JSON export**, **Client-side HTML export**, **Print/PDF**, and **Lifecycle Status Tracking** (`DRAFT` → `SUBMITTED` → `PAID` / `REJECTED`).

---

## 12. Recovery Output

Inspected from [`frontend/app/recovery/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/recovery/page.jsx) and [`backend/app/api/routes.py:L207-L241`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/api/routes.py#L207-L241):

### 12.1. Recovery Pipeline Flow
```
Investigation DB Records
       ↓
GET /api/v1/recovery/opportunities?company_id={id}
       └── Queries investigations where assessment == 'CONTRADICTED' AND claim_supported == True
       ↓
Enriched on Frontend by matching against GET /api/v1/claims:
       ├── If no claim created yet → Effective Status: "READY"
       ├── If claim exists with status "DRAFT" → Effective Status: "DRAFT"
       ├── If claim exists with status "SUBMITTED" → Effective Status: "SUBMITTED"
       ├── If claim exists with status "PAID" → Effective Status: "PAID"
       └── If claim exists with status "REJECTED" → Effective Status: "REJECTED"
```

### 12.2. Metric Computations on Real Data
- **Total Pipeline:** `sum(opportunity.amount)` across all opportunities.
- **Ready Amount:** `sum(amount)` where `effectiveStatus === "READY"`.
- **Draft Amount:** `sum(amount)` where `effectiveStatus === "DRAFT"`.
- **Submitted Amount:** `sum(amount)` where `effectiveStatus === "SUBMITTED"`.
- **Paid Amount:** `sum(amount)` where `effectiveStatus === "PAID"`.

---

## 13. Dashboard Outputs

Inspected from [`backend/app/services/stats_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/stats_service.py) and [`frontend/app/dashboard/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/dashboard/page.jsx):

All dashboard elements are **live calculations against the tenant's SQLite/Neon database**:

| Dashboard Output | Backend / Frontend Source | Exact Calculation | Real Data Confirmed? |
|---|---|---|---|
| **Total Deductions Assessed** | `GET /api/v1/dashboard/summary` → `total_fees` | `sum(c.amount for c in charges)` | **YES** (Real DB aggregation) |
| **Defensible Recovery Pipeline** | `GET /api/v1/dashboard/summary` → `potential_recovery` | `sum(i.claim_amount for i in investigations if i.claim_supported)` | **YES** (Sum of all contradicted claims) |
| **Claim Precision Rate** | `GET /api/v1/dashboard/summary` → `claim_precision_rate` | `100.0` if `supported_claims_count > 0` else `0.0` | **YES** (Measures % of supported claims that are backed by physical evidence) |
| **Conservative Skips** | Summed on frontend from `silent_count` + `uncertain_count` | `sum(1 for i in investigations if i.assessment in ['SILENT', 'UNCERTAIN'])` | **YES** (Real count of ungrounded or ambiguous fees skipped) |
| **Evidence Assessment Verdicts (Chart 1)** | `status_distribution` array | Ranked bar chart counting `CONTRADICTED`, `SILENT`, `UNCERTAIN`, `SUPPORTED`, `DUPLICATE / OFFSET` | **YES** (Horizontal Recharts bar chart) |
| **Deductions by Category (Chart 2)** | `charge_type_distribution` array | Grouped by `c.reason.replace('_', ' ').title()` and counted | **YES** (Horizontal Recharts bar chart) |
| **Recent Financial Deductions (Table)** | `GET /api/v1/charges?limit=6` | Queries top 6 charges sorted by `created_at desc` | **YES** (Links directly to `/investigations/[chargeId]`) |

---

## 14. Evidence Outputs

Inspected from [`backend/app/services/evidence_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/evidence_service.py) and [`frontend/app/evidence/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/evidence/page.jsx):

### 14.1. Evidence Records
- Available in Table view and Card view.
- Tracks `evidence_id`, `source_type` (`receiving`, `prep`, `pack`, `returns`), `unit_id`, `shipment_id`, `order_id`, `sku`, `finding` (`PASS`, `FAIL`, `UNCERTAIN`, `DAMAGED`, `SHORTAGE`), `photo_refs`, `operator_id`, and `timestamp`.

### 14.2. Relationship Graph (`GET /api/v1/evidence/graph/{charge_id}`)
- **Nodes & Edges:** Generated by backend in `evidence_service.build_evidence_graph`:
  - `Charge` root node (`type: charge`)
  - `Unit` node (`type: unit`) linked via edge `assessed_on`
  - `Shipment` node (`type: shipment`) linked via edge `inbound_to`
  - `Order` node (`type: order`) linked via edge `associated_order`
  - `SKU` node (`type: sku`) linked via edge `item_catalog`
  - `Evidence` nodes (`type: evidence`) linked from Unit or Shipment or Order with edge labels like `prep_proof`, `receiving_proof`, `returns_proof`.
- **Is Graph Backend or Frontend?** **Backend-derived.** Node IDs, edge sources/targets, and findings are constructed in Python and rendered interactively by `EvidenceGraph.jsx`.

### 14.3. Timeline Events
- Generated by backend in `hybrid_retrieval_engine.build_chronological_timeline`.
- Arranges events: `RECEIVING` → `PREP` → `PACK` → `RETURNS` → `FINANCIAL_CHARGE` based on timestamps.

---

## 15. Tenant / Workspace Flow

Inspected from [`frontend/context/WorkspaceContext.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/context/WorkspaceContext.jsx) and backend routers:

1. **Workspace Selection:** Managed in React context with default tenants `org_demo_alpha` (Alpha Retail Corp) and `org_demo_bravo` (Bravo Logistics Inc). Fetches registered companies on mount from `GET /api/v1/companies`.
2. **API Parameter Passing:** Frontend passes `company_id` as a query parameter or form field:
   - Charges: `GET /api/v1/charges?company_id={currentCompany}`
   - Evidence: `GET /api/v1/evidence?company_id={currentCompany}`
   - Investigations: `GET /api/v1/investigations/{id}?company_id={currentCompany}`
   - Uploads: `formData.append("company_id", currentCompany)`
3. **Data Isolation (RLS / Tenant Isolation):** Every SQLAlchemy query in `ChargeService`, `EvidenceService`, `InvestigationService`, and `ClaimService` includes `.filter(Model.company_id == company_id)`. Uploaded files are saved to isolated directory paths `uploads/company_{company_id}/`.
4. **Switching Workspaces:** Changing workspace in the top navigation immediately resets React state across all pages and re-queries all endpoints scoped to the new tenant.

---

## 16. Complete Input → Processing → Output Master Diagram

```
                                  USER INPUT
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     ▼                                ▼                                ▼
Bulk File Upload             Manual Charge Creation          Manual Evidence Creation
(CSV / XLSX / JSON / PDF)    (POST /charges)                 (POST /evidence)
     │                                │                                │
     ▼                                │                                │
File Storage                          │                                │
(Local uploads/ + Cloudinary)         │                                │
     │                                │                                │
     ▼                                │                                │
Universal Parsing                     │                                │
(IngestionParser)                     │                                │
     │                                │                                │
     ├────────────────────────────────┘                                │
     ▼                                                                 │
Entity Normalization                                                   │
(Charge, Shipment, Order)                                              │
     │                                                                 ▼
     │                                                   Vector Chunk Generation
     │                                                   (64-dim pseudo-semantic)
     │                                                                 │
     ▼                                                                 ▼
Database Deduplication                                   Database Deduplication
(charge_id collision check)                              (evidence_id collision check)
     │                                                                 │
     ▼                                                                 ▼
[charges table]                                          [evidence_records table]
     │                                                                 │
     └───────────────────────────────┬─────────────────────────────────┘
                                     ▼
                        MULTI-HOP RETRIEVAL ENGINE
                        (HybridRetrievalEngine)
                        ├── Hop 1: Match unit_id
                        ├── Hop 2: Match shipment_id / PO
                        ├── Hop 3: Match order_id
                        ├── Hop 4: Relational Order → Unit → Prep/Receiving
                        └── Hop 5: Vector Semantic Search (cosine >= 0.15)
                                     │
                                     ▼
                         FORENSIC REASONING AGENT
                         (RecoveryAgent)
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
1. Duplicate Check          2. Reimbursed Check         2b. Ledger Lock
(Existing identical charge) (Negative credit offset)    (Unit in ClaimLedger)
   → DUPLICATE                 → ALREADY_REIMBURSED        → ALREADY_REIMBURSED
         │                           │                           │
         └───────────────────────────┼───────────────────────────┘
                                     │ (If clean)
                                     ▼
                            3. Evidence Analysis
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
No relevant logs            Ambiguous logs / Crushing   Compliance verified
   → SILENT                    → UNCERTAIN                 → CONTRADICTED
                                                                 │
                                                                 ▼
                                                       [investigations table]
                                                                 │
                                                     ┌───────────┴───────────┐
                                                     ▼                       ▼
                                              claim_supported: true   claim_supported: false
                                                     │                       │
                                                     ▼                       ▼
                                            Recovery Opportunity     Conservative Skip
                                            (Listed in Pipeline)     ("Why Not Claim?")
                                                     │
                                                     ▼
                                            User Generates Claim
                                            (POST /claims)
                                                     │
                                                     ▼
                                            Claim Record Created
                                            ├── Frozen audit_packet JSON
                                            ├── Unit locked in claim_ledger
                                            └── Charge status → CLAIMED
                                                     │
                                                     ▼
                                            DISPUTE OUTPUT DOSSIER
                                            ├── Formatted Plain English Letter
                                            ├── Side-by-Side Fact Table
                                            ├── Client-side Standalone HTML
                                            ├── Print / Save as PDF
                                            ├── Copyable Plain Text & JSON
                                            └── Status: DRAFT → SUBMITTED → PAID
```

---

## 17. Implemented vs Frontend-Only vs Partial vs Not Implemented

### 17.1. IMPLEMENTED (Actually Works in Code)
- **Universal Multi-Format Ingestion:** CSV, Excel (.xlsx, .xls), JSON, and PDF (via PyPDF) parsing into DataFrames.
- **Tenant Isolation:** Multi-tenant company scoping on all models, queries, and file storage paths.
- **Ledger Deduplication:** Safe deduplication on `charge_id` and `evidence_id` preventing double entries and ledger corruption.
- **Multi-Hop Evidence Retrieval:** 5-hop structured and semantic retrieval across `unit_id`, `shipment_id`, `order_id`, and vector embeddings.
- **Deterministic Forensic Rules:** Complete rule evaluation for standard defect fees, prep compliance, lost inbound inventory, and returns.
- **Conservative Refusal Standards:** First-class `SILENT`, `UNCERTAIN`, `DUPLICATE`, and `ALREADY_REIMBURSED` verdicts with itemized missing items and rationale.
- **Unit Double-Claim Prevention:** `claim_ledger` table tracks claimed unit quantities, preventing repeat claims across billing cycles.
- **Claim Dossier Generation:** Automatic assembly of frozen audit packets, side-by-side comparison tables, plain-English dispute text, and standalone downloadable HTML files.
- **Interactive Graph & Timeline:** Backend endpoints generating multi-hop nodes/edges and chronological unit event histories.
- **Dashboard Analytics:** Live database KPI cards, ranked verdict bar charts, and category distribution bar charts.

### 17.2. FRONTEND REPRESENTATION ONLY
- **Live Carrier API Handshake:** The "Dispute Filed" and "Settled / Paid" statuses are updated via manual user clicks (`handleStatusChange` calling `PATCH /claims/{id}/status`), not through an active real-time webhook or live API connection to Amazon SP-API or Walmart Marketplace.
- **Print to PDF:** Handled using the browser's native `window.print()` and CSS print media queries, rather than a backend headless Chrome / WeasyPrint PDF binary generator.

### 17.3. PARTIALLY IMPLEMENTED
- **Gemini LLM Reasoning:** The LLM integration is implemented in [`llm_reasoner.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/llm_reasoner.py), but only executes when `GEMINI_API_KEY` is present and valid; otherwise, it falls back to a deterministic local NLP keyword evaluator.
- **Cloudinary Storage:** The system falls back to local disk storage if Cloudinary credentials are not defined in the environment.

### 17.4. NOT IMPLEMENTED
- **Direct Marketplace Auto-Filing Bot:** The system does not automatically log into Amazon Seller Central via Selenium/Playwright to submit claims. It prepares the commercial dispute packet for the analyst to submit or export.
- **OCR on Attached Image Fixtures:** Image file paths are stored in `photo_refs`, but pixels are not passed through an OCR/vision model to extract text from photos.

---

## 18. Exact Example Input Files / Schemas

Generated strictly from [`IngestionParser.transform_to_entities`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py) and actual repository datasets in [`data/`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/data/):

### 18.1. Financial Fee Report CSV (`fee_report_sample.csv`)
```csv
line_id,report_type,unit_id,org_id,sku,fnsku,fba_shipment_id,order_id,charge_type,quantity,amount_usd,posted_date
FEE-0014-1,fee_report,UNIT-0014,org_demo_alpha,SKU-LAMP-LED,X00DUMMY014,FBA-DUMMY-101,,inbound_defect_fee,1,2.00,2026-07-18
FEE-0016-1,fee_report,UNIT-0016,org_demo_alpha,SKU-TOWEL-BLU,X00DUMMY016,,ORD-DUMMY-50016,refund_issued_item_not_returned,1,18.50,2026-07-22
FEE-0020-1,fee_report,UNIT-0020,org_demo_alpha,SKU-PUZZLE-500,X00DUMMY020,FBA-DUMMY-102,,lost_inbound,1,14.00,2026-07-25
```

### 18.2. Upstream Receiving CSV (`receiving_sample.csv`)
```csv
record_id,unit_id,org_id,po_number,po_line,supplier,sku,asin,product_title,spec_colour,spec_variant,spec_components,cartons_ordered,cartons_received,units_per_carton_ordered,units_per_carton_counted,qty_ordered,qty_received,identity_match,carton_damage,unit_damage,quality_flags,photo_refs,operator_id,captured_at
RCV-0001,UNIT-0001,org_demo_alpha,PO-7000,2,Supplier East,SKU-TOWEL-BLU,B0DUMMY600,Cotton Bath Towel,blue,bath,towel,1,1,24,24,24,24,yes,none,none,,fixtures/receiving/UNIT-0001_carton.jpg,op_eli,2026-06-04T17:32:00Z
RCV-0003,UNIT-0003,org_demo_alpha,PO-7000,4,Supplier Coastal,SKU-PUZZLE-500,B0DUMMY729,Jigsaw Puzzle 500pc,n/a,500pc,puzzle pieces,4,4,12,11,48,44,yes,crushing,uncertain,,fixtures/receiving/UNIT-0003_carton.jpg,op_dana,2026-06-04T02:54:00Z
```

### 18.3. Upstream Prep Compliance CSV (`prep_sample.csv`)
```csv
record_id,unit_id,org_id,work_order_id,fba_shipment_id,sku,asin,fnsku,prep_price_usd,wo_polybag,wo_suffocation_warning,wo_expiry_date,wo_handling_marks,polybag_present_sealed,suffocation_warning,fnsku_label_placement,original_barcode_covered,expiry_date,handling_marks,photo_refs,operator_id,captured_at
PRP-0002,UNIT-0002,org_demo_alpha,WO-3000,FBA-DUMMY-100,SKU-CANDLE-3,B0DUMMY964,X00DUMMY002,0.40,False,False,False,fragile,yes,not_required,flat,yes,not_required,all_present,fixtures/prep/UNIT-0002_label.jpg,op_amira,2026-06-04T12:25:00Z
PRP-0003,UNIT-0003,org_demo_alpha,WO-3000,FBA-DUMMY-100,SKU-PUZZLE-500,B0DUMMY729,X00DUMMY003,0.90,True,True,False,,not_sealed,legible,flat,no,not_required,not_required,fixtures/prep/UNIT-0003_label.jpg,op_fatima,2026-06-04T15:54:00Z
```

### 18.4. Upstream Pack Sheet CSV (`pack_sample.csv`)
```csv
record_id,unit_id,org_id,order_id,channel,order_lines,observed_in_box,operator_verdict,photo_refs,operator_id,captured_at
PCK-0006,UNIT-0006,org_demo_alpha,ORD-DUMMY-50006,shopify,SKU-CABLE-USBC:1,SKU-CABLE-USBC:1,seal,fixtures/pack/UNIT-0006_open_box.jpg,op_ben,2026-06-22T08:10:00Z
PCK-0008,UNIT-0008,org_demo_alpha,ORD-DUMMY-50008,shopify,SKU-BOTTLE-750:1,SKU-BOTTLE-750:1,stop_and_fix,fixtures/pack/UNIT-0008_open_box.jpg,op_amira,2026-06-09T15:31:00Z
```

### 18.5. Upstream Customer Returns CSV (`returns_sample.csv`)
```csv
record_id,unit_id,org_id,order_id,ordered_sku,ordered_asin,identity_match,parts_list,parts_missing,observed_state,amazon_condition,operator_disposition,photo_refs,operator_id,captured_at
RTN-0014,UNIT-0014,org_demo_alpha,ORD-DUMMY-50014,SKU-LAMP-LED,B0DUMMY357,yes,lamp;usb cable;manual,,signs_of_use,,liquidate,fixtures/returns/UNIT-0014_1.jpg,op_eli,2026-07-18T07:36:00Z
RTN-0016,UNIT-0016,org_demo_alpha,ORD-DUMMY-50016,SKU-TOWEL-BLU,B0DUMMY600,yes,towel,,opened_unused,,restock,fixtures/returns/UNIT-0016_1.jpg,op_ben,2026-06-25T07:31:00Z
```

---

## 19. Simple Non-Technical Explanation

### What I Give the System
1. **Marketplace Fee Reports:** The spreadsheet you download from Amazon Seller Central showing the fee penalties, defect charges, or inventory adjustments taken from your account.
2. **Warehouse Quality Logs:** Your internal warehouse receiving logs, prep checklists, pack verification scans, and customer returns desk logs.

### What the System Does
1. **Reads & Organizes:** Automatically figures out which file is which, strips out duplicates, and connects your transactions to your physical units.
2. **Matches Proof:** Traces the deduction across unit numbers, shipment boxes, and customer order numbers to locate your warehouse inspection records.
3. **Audits the Charge:**
   - If your warehouse logged that the box had a sealed bag and flat barcode, but Amazon charged you for an "unsealed bag", the system flags it as **`CONTRADICTED`** (you were wrongly charged).
   - If your warehouse noted that the item actually was damaged or missing, it flags it as **`SUPPORTED`** (the fee is valid, do not dispute).
   - If there is no inspection record or the proof is unclear, it flags it as **`SILENT`** or **`UNCERTAIN`** (conservative skip to protect your seller account).

### What the System Gives Me
1. **A Live Recovery Dollar Total:** An exact breakdown of how much money was improperly deducted that you can legally claim back.
2. **An Audit Dossier:** A formal, audit-ready dispute package containing:
   - A plain-English legal letter.
   - A side-by-side comparison table proving you followed policy.
   - Exact warehouse operator timestamps and photo references.
   - Downloadable standalone files (.html and .json) and copy-paste text ready to submit into Amazon Seller Support tickets.

### Simple Example
```
INPUT:
├── Marketplace Deduction: Charge FEE-0014-1 ($2.00 fee claiming "inbound defect / polybag missing")
└── Warehouse Evidence: Prep station record PRP-0002 showing "polybag_present_sealed: yes"

PROCESS:
├── System matches Unit UNIT-0014 across both records
└── System compares the rule: Fee claims defect, but physical log proves compliance

OUTPUT:
├── Verdict: CONTRADICTED
├── Decision: Claim Supported ($2.00)
└── Output: Dossier CLM-0014-1 with ready-to-file dispute text: "We formally challenge fee assessment FEE-0014-1 ($2.00 USD)..."
```

---

## 20. Files Inspected

| File Path | Purpose | Relevant Functions / Components |
|---|---|---|
| [`backend/app/ingestion/parsers.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/ingestion/parsers.py) | Ingestion & file parsing | `detect_file_type`, `parse_file_to_dataframe`, `validate_and_preview`, `transform_to_entities` |
| [`backend/app/api/routes.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/api/routes.py) | Core FastAPI route definitions | `import_file`, `preview_file_upload`, `get_charges`, `get_evidence_list`, `run_charge_investigation`, `create_claim`, `get_recovery_opportunities` |
| [`backend/app/models/models.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/models/models.py) | Database schemas & relationships | `Company`, `User`, `Charge`, `EvidenceRecord`, `EvidenceChunk`, `Investigation`, `Claim`, `ClaimLedger`, `Shipment`, `Order` |
| [`backend/app/schemas/schemas.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/schemas/schemas.py) | Pydantic validation schemas | `ChargeCreate`, `EvidenceCreate`, `InvestigationResult`, `ClaimResponse`, `DashboardMetrics`, `IngestionPreview` |
| [`backend/app/rag/retrieval.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/rag/retrieval.py) | Multi-hop evidence retrieval | `retrieve_evidence_multi_hop`, `analyze_evidence_relevance`, `build_chronological_timeline`, `get_embedding` |
| [`backend/app/agents/recovery_agent.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/agents/recovery_agent.py) | Forensic verdict rule engine | `investigate_charge` (steps 1 to 5: duplicate checks, reimbursed checks, ledger checks, defect rules, return rules) |
| [`backend/app/services/llm_reasoner.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/llm_reasoner.py) | AI & local forensic fallbacks | `analyze_unmodeled_charge`, `_local_forensic_eval`, `_build_prompt` |
| [`backend/app/services/charge_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/charge_service.py) | Charge management & batch audit | `list_charges`, `get_charge`, `run_batch_investigations` |
| [`backend/app/services/evidence_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/evidence_service.py) | Evidence queries & graph builder | `list_evidence`, `get_evidence_by_id`, `build_evidence_graph` |
| [`backend/app/services/claim_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/claim_service.py) | Claim packaging & ledger locking | `generate_claim_package`, `list_claims`, `update_claim_status` |
| [`backend/app/services/stats_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/services/stats_service.py) | Live KPI metrics aggregation | `get_dashboard_metrics` |
| [`backend/app/storage/storage_service.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/storage/storage_service.py) | File storage & Cloudinary | `save_file` |
| [`backend/app/config/settings.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/app/config/settings.py) | App configuration & secrets | `Settings` (DATABASE_URL, GEMINI_API_KEY, LOCAL_STORAGE_DIR) |
| [`backend/seed.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/seed.py) | Multi-tenant database seeder | `seed_database` |
| [`backend/execute_all_test_cases.py`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/backend/execute_all_test_cases.py) | Automated test suite | `run_all_cases` (tests 10 audit scenarios) |
| [`frontend/lib/api.js`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/lib/api.js) | Frontend API client | `fetchApi`, `api.*` methods |
| [`frontend/context/WorkspaceContext.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/context/WorkspaceContext.jsx) | Multi-tenant workspace state | `WorkspaceProvider`, `useWorkspace`, `switchCompany` |
| [`frontend/app/data-sources/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/data-sources/page.jsx) | Ingestion workspace UI | File upload, pre-validation preview, audit log, manual forms |
| [`frontend/app/dashboard/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/dashboard/page.jsx) | Dashboard Analytics UI | Live KPI cards, verdict distribution chart, category chart, recent charges table |
| [`frontend/app/charges/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/charges/page.jsx) | Charges Explorer UI | Charge table with status filter, search, investigation links |
| [`frontend/app/evidence/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/evidence/page.jsx) | Evidence Workspace UI | Evidence table, card views, graph & timeline tabs |
| [`frontend/app/investigations/[chargeId]/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/investigations/%5BchargeId%5D/page.jsx) | Forensic Investigation UI | Case detail, verdict hero, timeline, proof breakdown, dossier generator |
| [`frontend/app/recovery/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/recovery/page.jsx) | Recovery Pipeline UI | Contradicted opportunities, pipeline stages, quick-claim actions |
| [`frontend/app/claims/page.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/app/claims/page.jsx) | Claims Ledger UI | Track filed, drafted, and recovered dispute claims |
| [`frontend/components/ClaimPackageModal.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/components/ClaimPackageModal.jsx) | Claim Dossier Modal | Letter view, JSON view, HTML export, print handler, status updates |
| [`frontend/components/EvidenceGraph.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/components/EvidenceGraph.jsx) | Interactive Graph Component | Visual representation of Charge → Unit → Shipment → Order → Evidence |
| [`frontend/components/EvidenceTimeline.jsx`](file:///e:/saif/projects%20made/cube-05-recovery-manager-saif-8671/frontend/components/EvidenceTimeline.jsx) | Chronological Timeline Component | Lifecycle stage cards with findings and timestamps |

---

## 21. Files Modified

**Files modified: NONE** (0 files modified).  
This task was executed as a strict read-only audit in accordance with instructions.

---

## 22. Known Gaps / Technical Risks

1. **PDF Ingestion Structural Parsing:** While `.pdf` files are parsed via `pypdf`, text lines are dumped as unstructured strings into `raw_line`. PDF parsing does not currently extract columnar tables into structured `Charge` or `EvidenceRecord` entities unless custom tabular extractors (e.g., `pdfplumber` or `camelot`) are introduced.
2. **Batch Investigation Scaling on Large Ingestion:** In `routes.py:L388`, when `added_charges > 0`, the backend executes `charge_service.run_batch_investigations(db, company_id)` synchronously inside the HTTP import request. For small-to-medium files (100–500 rows), this executes quickly; for enterprise files with >5,000 charges, this will block the HTTP thread or exceed server timeout limits unless offloaded to a background task (`Celery`, `Arq`, or FastAPI `BackgroundTasks`).
3. **Pseudo-Semantic Vector Dimension (64-dim Hash):** When `OPENAI_API_KEY` is not present, vector embeddings use a lightweight 64-dimensional pseudo-semantic token-hash algorithm. While deterministic and zero-dependency, it is an approximate syntactic hash rather than a dense neural vector embedding.
4. **Marketplace Status Synchronization:** The claim workflow includes status transitions (`DRAFT` → `SUBMITTED` → `PAID`), but these transitions are manual user actions. Real-time reconciliation against Amazon SP-API Settlement Reports (`GET_V2_SETTLEMENT_REPORT_DATA_FLAT_FILE`) is not automated.