import os
import sys
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import pandas as pd
from app.database.session import SessionLocal, init_db
from app.models.models import Company, User, Charge, EvidenceRecord, EvidenceChunk, Shipment, Order
from app.ingestion.parsers import ingestion_parser
from app.services.charge_service import charge_service
from app.rag.retrieval import hybrid_retrieval_engine

def seed_database():
    print("[*] Initializing database tables...")
    init_db()
    db = SessionLocal()

    try:
        # 1. Create Companies (Section 6, 40)
        print("[*] Creating multi-tenant companies...")
        alpha = db.query(Company).filter(Company.id == "org_demo_alpha").first()
        if not alpha:
            alpha = Company(id="org_demo_alpha", name="Alpha Retail Corp")
            db.add(alpha)

        bravo = db.query(Company).filter(Company.id == "org_demo_bravo").first()
        if not bravo:
            bravo = Company(id="org_demo_bravo", name="Bravo Logistics Inc")
            db.add(bravo)

        # Users
        u1 = db.query(User).filter(User.email == "analyst@alpharetail.com").first()
        if not u1:
            db.add(User(company_id="org_demo_alpha", name="Sarah Chen", email="analyst@alpharetail.com", role="Admin"))
        u2 = db.query(User).filter(User.email == "ops@bravologistics.com").first()
        if not u2:
            db.add(User(company_id="org_demo_bravo", name="Marcus Vance", email="ops@bravologistics.com", role="Analyst"))

        db.commit()

        # Data directory path
        repo_root = Path(__file__).resolve().parent.parent
        data_dir = repo_root / "data"
        upstream_dir = data_dir / "upstream"

        # 2. Ingest Upstream Evidence First
        upstream_files = [
            ("receiving", upstream_dir / "receiving_sample.csv"),
            ("prep", upstream_dir / "prep_sample.csv"),
            ("pack", upstream_dir / "pack_sample.csv"),
            ("returns", upstream_dir / "returns_sample.csv"),
        ]

        # Preload existing evidence IDs
        existing_evidence_ids = {r[0] for r in db.query(EvidenceRecord.evidence_id).all()}
        
        for file_type, file_path in upstream_files:
            if file_path.exists():
                print(f"[*] Ingesting upstream {file_type} from {file_path.name}...")
                df = pd.read_csv(file_path)
                _, ev_records, masters = ingestion_parser.transform_to_entities(df, file_type, "org_demo_alpha")
                for ev in ev_records:
                    if ev.evidence_id not in existing_evidence_ids:
                        db.add(ev)
                        existing_evidence_ids.add(ev.evidence_id)
                        if ev.description:
                            chunk = EvidenceChunk(
                                company_id=ev.company_id,
                                evidence_id=ev.evidence_id,
                                content=ev.description,
                                embedding=hybrid_retrieval_engine.get_embedding(ev.description),
                                meta={"source_type": ev.source_type, "unit_id": ev.unit_id}
                            )
                            db.add(chunk)
                for m in masters:
                    db.add(m)
                db.commit()

        # 3. Ingest Fee Report
        fee_file = data_dir / "fee_report_sample.csv"
        if fee_file.exists():
            print(f"[*] Ingesting fee report from {fee_file.name}...")
            df = pd.read_csv(fee_file)
            charges, _, _ = ingestion_parser.transform_to_entities(df, "fee_report", "org_demo_alpha")
            existing_charge_ids = {r[0] for r in db.query(Charge.charge_id).all()}
            for c in charges:
                if c.charge_id not in existing_charge_ids:
                    db.add(c)
                    existing_charge_ids.add(c.charge_id)
            db.commit()

        # 3b. Ingest Sample Charges & Evidence for Bravo (org_demo_bravo)
        print("[*] Ingesting sample charges and evidence for Bravo (org_demo_bravo)...")
        bravo_charges = [
            Charge(
                company_id="org_demo_bravo",
                charge_id="CH-BRV-001",
                unit_id="UNIT-BRV-101",
                shipment_id="FBA-BRV-01",
                order_id="ORD-BRV-501",
                sku="SKU-BRV-ALPHA-DIFF",
                fnsku="X00BRV101",
                reason="inbound_defect_fee",
                amount=34.50,
                currency="USD",
                charge_date="2026-06-20",
                status="UNINVESTIGATED"
            ),
            Charge(
                company_id="org_demo_bravo",
                charge_id="CH-BRV-002",
                unit_id="UNIT-BRV-102",
                shipment_id="FBA-BRV-02",
                order_id="ORD-BRV-502",
                sku="SKU-BRV-BETA-DIFF",
                fnsku="X00BRV102",
                reason="lost_inbound",
                amount=72.00,
                currency="USD",
                charge_date="2026-06-22",
                status="UNINVESTIGATED"
            )
        ]
        for c in bravo_charges:
            if c.charge_id not in existing_charge_ids:
                db.add(c)
                existing_charge_ids.add(c.charge_id)

        bravo_evidences = [
            EvidenceRecord(
                company_id="org_demo_bravo",
                evidence_id="EVID-BRV-PRP-001",
                source_type="prep",
                unit_id="UNIT-BRV-101",
                shipment_id="FBA-BRV-01",
                order_id="ORD-BRV-501",
                sku="SKU-BRV-ALPHA-DIFF",
                event_type="fba_prep_compliance",
                finding="PASS",
                description="Bravo Prep inspection: polybag verified sealed airtight, barcode covered.",
                raw_payload={"polybag_present_sealed": "yes", "original_barcode_covered": "yes", "fnsku_label_placement": "flat"},
                operator_id="ops_marcus",
                timestamp="2026-06-19T14:30:00Z"
            ),
            EvidenceRecord(
                company_id="org_demo_bravo",
                evidence_id="EVID-BRV-RCV-002",
                source_type="receiving",
                unit_id="UNIT-BRV-102",
                shipment_id="FBA-BRV-02",
                order_id="ORD-BRV-502",
                sku="SKU-BRV-BETA-DIFF",
                event_type="receiving_inspection",
                finding="PASS",
                description="Bravo Receiving inspection: 10/10 units received undamaged in pristine cartons.",
                raw_payload={"carton_damage": "none", "unit_damage": "none", "qty_ordered": 10, "qty_received": 10},
                operator_id="ops_marcus",
                timestamp="2026-06-21T09:15:00Z"
            )
        ]
        for ev in bravo_evidences:
            if ev.evidence_id not in existing_evidence_ids:
                db.add(ev)
                existing_evidence_ids.add(ev.evidence_id)
                if ev.description:
                    chunk = EvidenceChunk(
                        company_id=ev.company_id,
                        evidence_id=ev.evidence_id,
                        content=ev.description,
                        embedding=hybrid_retrieval_engine.get_embedding(ev.description),
                        meta={"source_type": ev.source_type, "unit_id": ev.unit_id}
                    )
                    db.add(chunk)
        db.commit()

        print("[*] Running initial agent investigations on charges...")
        res_alpha = charge_service.run_batch_investigations(db, "org_demo_alpha")
        print(f"    -> Alpha: {res_alpha}")
        res_bravo = charge_service.run_batch_investigations(db, "org_demo_bravo")
        print(f"    -> Bravo: {res_bravo}")

        print("\n[SUCCESS] Seed complete! Multi-tenant recovery database ready.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
