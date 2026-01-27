"""
Reports API Router

Generates clean, organized reports from assessment data with LLM summarization.
"""

from uuid import UUID
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel
import io
import csv
import json

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.visit import Visit
from app.models.client import Client
from app.models.billable_item import BillableItem
from app.models.contract import Contract
from app.models.caregiver import Caregiver

router = APIRouter()


# ============ Response Models ============

class ServiceSummary(BaseModel):
    category: str
    label: str
    total_mentions: int
    clients_count: int
    description: str

class WeeklyTimesheetReport(BaseModel):
    period_start: str
    period_end: str
    total_assessments: int
    total_clients: int
    total_services: int
    services_by_category: List[ServiceSummary]
    assessments: List[dict]
    generated_at: str

class MonthlySummaryReport(BaseModel):
    month: str
    year: int
    total_assessments: int
    completed_assessments: int
    pending_assessments: int
    total_contracts_generated: int
    total_clients_served: int
    new_clients: int
    services_breakdown: List[dict]
    weekly_trend: List[dict]
    summary: str
    generated_at: str

class BillingReportItem(BaseModel):
    client_name: str
    assessment_date: str
    services: List[dict]
    total_services: int
    contract_status: str
    estimated_weekly: Optional[float]
    estimated_monthly: Optional[float]

class BillingReport(BaseModel):
    period: str
    total_assessments: int
    total_services_identified: int
    services_by_type: List[dict]
    client_billing: List[BillingReportItem]
    summary: str
    generated_at: str

class ClientActivityItem(BaseModel):
    client_id: str
    client_name: str
    total_assessments: int
    last_assessment_date: Optional[str]
    care_level: Optional[str]
    services_identified: List[str]
    contract_status: str
    status: str

class ClientActivityReport(BaseModel):
    total_clients: int
    active_clients: int
    clients_with_contracts: int
    clients_pending: int
    clients: List[ClientActivityItem]
    summary: str
    generated_at: str


# ============ Service Category Labels ============

CATEGORY_LABELS = {
    "ADL_HYGIENE": "Bathing & Hygiene",
    "ADL_DRESSING": "Dressing Assistance",
    "ADL_GROOMING": "Grooming",
    "MED_REMINDER": "Medication Management",
    "VITALS": "Health Monitoring",
    "MEAL_PREP": "Meal Preparation",
    "MEAL_ASSIST": "Feeding Assistance",
    "ADL_MOBILITY": "Mobility Assistance",
    "MOBILITY_ASSIST": "Transfer Assistance",
    "EXERCISE": "Exercise & Therapy",
    "HOUSEHOLD_LIGHT": "Light Housekeeping",
    "HOUSEHOLD_LAUNDRY": "Laundry Services",
    "COMPANIONSHIP": "Companionship",
    "SUPERVISION": "Safety Supervision",
}

SERVICE_TYPES = {
    "ADL_HYGIENE": "Personal Care",
    "ADL_DRESSING": "Personal Care",
    "ADL_GROOMING": "Personal Care",
    "MED_REMINDER": "Medication",
    "VITALS": "Health Monitoring",
    "MEAL_PREP": "Nutrition",
    "MEAL_ASSIST": "Nutrition",
    "ADL_MOBILITY": "Mobility",
    "MOBILITY_ASSIST": "Mobility",
    "EXERCISE": "Mobility",
    "HOUSEHOLD_LIGHT": "Homemaking",
    "HOUSEHOLD_LAUNDRY": "Homemaking",
    "COMPANIONSHIP": "Companionship",
    "SUPERVISION": "Safety",
}


# ============ Overview Stats ============

class OverviewStats(BaseModel):
    assessments_this_week: int
    services_identified: int
    contracts_generated: int
    active_clients: int
    
@router.get("/overview")
async def get_overview_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get quick overview stats for the reports dashboard.
    """
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Assessments this week
    assessments_this_week = db.query(func.count(Visit.id)).filter(
        Visit.created_at >= week_start
    ).scalar() or 0
    
    # Total services identified (all billable items)
    services_identified = db.query(func.count(BillableItem.id)).scalar() or 0
    
    # Contracts generated
    contracts_generated = db.query(func.count(Contract.id)).scalar() or 0
    
    # Active clients (clients with at least one visit)
    active_clients = db.query(func.count(func.distinct(Visit.client_id))).scalar() or 0
    
    return {
        "assessments_this_week": assessments_this_week,
        "services_identified": services_identified,
        "contracts_generated": contracts_generated,
        "active_clients": active_clients,
    }


# ============ Weekly Timesheet Report ============

@router.get("/timesheet", response_model=WeeklyTimesheetReport)
async def get_weekly_timesheet(
    weeks_back: int = Query(default=0, description="Number of weeks back (0 = current week)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get weekly timesheet report with all billable services identified in assessments.
    """
    # Calculate date range
    today = datetime.now()
    start_of_week = today - timedelta(days=today.weekday() + (weeks_back * 7))
    start_of_week = start_of_week.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_week = start_of_week + timedelta(days=7)
    
    # Get visits in date range
    visits = db.query(Visit).filter(
        and_(
            Visit.created_at >= start_of_week,
            Visit.created_at < end_of_week
        )
    ).all()
    
    # Get all billables for these visits
    visit_ids = [v.id for v in visits]
    billables = db.query(BillableItem).filter(
        BillableItem.visit_id.in_(visit_ids)
    ).all() if visit_ids else []
    
    # Aggregate by category
    category_stats = {}
    for b in billables:
        cat = b.category
        if cat not in category_stats:
            category_stats[cat] = {
                "category": cat,
                "label": CATEGORY_LABELS.get(cat, cat),
                "total_mentions": 0,
                "clients": set(),
                "description": SERVICE_TYPES.get(cat, "Other"),
            }
        category_stats[cat]["total_mentions"] += 1
        # Find the visit to get client
        for v in visits:
            if v.id == b.visit_id and v.client_id:
                category_stats[cat]["clients"].add(str(v.client_id))
    
    services_summary = [
        ServiceSummary(
            category=s["category"],
            label=s["label"],
            total_mentions=s["total_mentions"],
            clients_count=len(s["clients"]),
            description=s["description"],
        )
        for s in sorted(category_stats.values(), key=lambda x: x["total_mentions"], reverse=True)
    ]
    
    # Build assessment list
    assessments = []
    for visit in visits:
        visit_billables = [b for b in billables if b.visit_id == visit.id]
        assessments.append({
            "id": str(visit.id),
            "client_name": visit.client.full_name if visit.client else "Unknown",
            "date": visit.created_at.strftime("%Y-%m-%d"),
            "services_count": len(visit_billables),
            "services": list(set([CATEGORY_LABELS.get(b.category, b.category) for b in visit_billables])),
            "status": visit.status,
        })
    
    # Get unique clients
    client_ids = set(v.client_id for v in visits if v.client_id)
    
    return WeeklyTimesheetReport(
        period_start=start_of_week.strftime("%Y-%m-%d"),
        period_end=end_of_week.strftime("%Y-%m-%d"),
        total_assessments=len(visits),
        total_clients=len(client_ids),
        total_services=len(billables),
        services_by_category=services_summary,
        assessments=assessments,
        generated_at=datetime.now().isoformat(),
    )


# ============ Monthly Summary Report ============

@router.get("/monthly-summary", response_model=MonthlySummaryReport)
async def get_monthly_summary(
    month: int = Query(default=None, description="Month (1-12), defaults to current"),
    year: int = Query(default=None, description="Year, defaults to current"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get monthly summary with assessment statistics and service breakdown.
    """
    today = datetime.now()
    target_month = month or today.month
    target_year = year or today.year
    
    # Date range for the month
    start_date = datetime(target_year, target_month, 1)
    if target_month == 12:
        end_date = datetime(target_year + 1, 1, 1)
    else:
        end_date = datetime(target_year, target_month + 1, 1)
    
    # Get all visits for the month
    visits = db.query(Visit).filter(
        and_(
            Visit.created_at >= start_date,
            Visit.created_at < end_date
        )
    ).all()
    
    # Get contracts generated this month
    contracts = db.query(Contract).filter(
        and_(
            Contract.created_at >= start_date,
            Contract.created_at < end_date
        )
    ).all()
    
    # Get new clients this month
    new_clients = db.query(Client).filter(
        and_(
            Client.created_at >= start_date,
            Client.created_at < end_date
        )
    ).count()
    
    # Get billables
    visit_ids = [v.id for v in visits]
    billables = db.query(BillableItem).filter(
        BillableItem.visit_id.in_(visit_ids)
    ).all() if visit_ids else []
    
    # Services breakdown by type
    service_type_counts = {}
    for b in billables:
        stype = SERVICE_TYPES.get(b.category, "Other")
        if stype not in service_type_counts:
            service_type_counts[stype] = {"type": stype, "count": 0, "categories": set()}
        service_type_counts[stype]["count"] += 1
        service_type_counts[stype]["categories"].add(CATEGORY_LABELS.get(b.category, b.category))
    
    services_breakdown = [
        {
            "type": v["type"],
            "count": v["count"],
            "services": list(v["categories"]),
        }
        for v in sorted(service_type_counts.values(), key=lambda x: x["count"], reverse=True)
    ]
    
    # Weekly trend
    weekly_trend = []
    for week_num in range(4):
        week_start = start_date + timedelta(weeks=week_num)
        week_end = min(week_start + timedelta(days=7), end_date)
        week_visits = [v for v in visits if week_start <= v.created_at < week_end]
        weekly_trend.append({
            "week": f"Week {week_num + 1}",
            "assessments": len(week_visits),
            "start_date": week_start.strftime("%m/%d"),
        })
    
    # Status counts
    completed = len([v for v in visits if v.status in ['approved', 'exported', 'completed']])
    pending = len([v for v in visits if v.status in ['pending_review', 'scheduled', 'in_progress']])
    
    # Unique clients served
    clients_served = len(set(v.client_id for v in visits if v.client_id))
    
    # Generate summary
    month_name = start_date.strftime("%B %Y")
    summary = f"In {month_name}, {len(visits)} care assessments were completed for {clients_served} clients. "
    if services_breakdown:
        top_service = services_breakdown[0]
        summary += f"The most common service type was {top_service['type']} with {top_service['count']} mentions. "
    summary += f"{len(contracts)} contracts were generated and {new_clients} new clients were added."
    
    return MonthlySummaryReport(
        month=start_date.strftime("%B"),
        year=target_year,
        total_assessments=len(visits),
        completed_assessments=completed,
        pending_assessments=pending,
        total_contracts_generated=len(contracts),
        total_clients_served=clients_served,
        new_clients=new_clients,
        services_breakdown=services_breakdown,
        weekly_trend=weekly_trend,
        summary=summary,
        generated_at=datetime.now().isoformat(),
    )


# ============ Billing Report ============

@router.get("/billing", response_model=BillingReport)
async def get_billing_report(
    days: int = Query(default=30, description="Number of days to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed billing report with services breakdown per client.
    """
    start_date = datetime.now() - timedelta(days=days)
    
    # Get visits in date range
    visits = db.query(Visit).filter(
        Visit.created_at >= start_date
    ).order_by(Visit.created_at.desc()).all()
    
    # Get billables
    visit_ids = [v.id for v in visits]
    billables = db.query(BillableItem).filter(
        BillableItem.visit_id.in_(visit_ids)
    ).all() if visit_ids else []
    
    # Group billables by visit
    visit_billables_map = {}
    for b in billables:
        if b.visit_id not in visit_billables_map:
            visit_billables_map[b.visit_id] = []
        visit_billables_map[b.visit_id].append(b)
    
    # Services by type for overall breakdown
    service_type_counts = {}
    for b in billables:
        stype = SERVICE_TYPES.get(b.category, "Other")
        label = CATEGORY_LABELS.get(b.category, b.category)
        if stype not in service_type_counts:
            service_type_counts[stype] = {"type": stype, "services": {}, "total": 0}
        if label not in service_type_counts[stype]["services"]:
            service_type_counts[stype]["services"][label] = 0
        service_type_counts[stype]["services"][label] += 1
        service_type_counts[stype]["total"] += 1
    
    services_by_type = [
        {
            "type": v["type"],
            "total": v["total"],
            "services": [{"name": k, "count": c} for k, c in v["services"].items()],
        }
        for v in sorted(service_type_counts.values(), key=lambda x: x["total"], reverse=True)
    ]
    
    # Build client billing items
    client_billing = []
    for visit in visits:
        vb = visit_billables_map.get(visit.id, [])
        
        # Get contract for this client
        contract = db.query(Contract).filter(
            Contract.client_id == visit.client_id
        ).order_by(Contract.created_at.desc()).first() if visit.client_id else None
        
        services_list = []
        for b in vb:
            services_list.append({
                "category": CATEGORY_LABELS.get(b.category, b.category),
                "type": SERVICE_TYPES.get(b.category, "Other"),
                "approved": b.is_approved,
            })
        
        client_billing.append(BillingReportItem(
            client_name=visit.client.full_name if visit.client else "Unknown",
            assessment_date=visit.created_at.strftime("%Y-%m-%d"),
            services=services_list,
            total_services=len(vb),
            contract_status="Generated" if contract else "Pending",
            estimated_weekly=float(contract.weekly_hours * contract.hourly_rate) if contract and contract.weekly_hours and contract.hourly_rate else None,
            estimated_monthly=float(contract.weekly_hours * contract.hourly_rate * 4.33) if contract and contract.weekly_hours and contract.hourly_rate else None,
        ))
    
    # Summary
    total_services = len(billables)
    summary = f"Over the past {days} days, {len(visits)} assessments identified {total_services} care services. "
    if services_by_type:
        summary += f"Top service category: {services_by_type[0]['type']} ({services_by_type[0]['total']} services). "
    contracts_generated = len([cb for cb in client_billing if cb.contract_status == "Generated"])
    summary += f"{contracts_generated} assessments have generated contracts."
    
    return BillingReport(
        period=f"Last {days} days",
        total_assessments=len(visits),
        total_services_identified=total_services,
        services_by_type=services_by_type,
        client_billing=client_billing,
        summary=summary,
        generated_at=datetime.now().isoformat(),
    )


# ============ Client Activity Report ============

@router.get("/client-activity", response_model=ClientActivityReport)
async def get_client_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get client activity report with assessment history.
    """
    # Get all clients
    clients = db.query(Client).order_by(Client.created_at.desc()).all()
    
    client_items = []
    clients_with_contracts = 0
    active_clients = 0
    
    for client in clients:
        # Get visits for this client
        visits = db.query(Visit).filter(
            Visit.client_id == client.id
        ).order_by(Visit.created_at.desc()).all()
        
        # Get billables for these visits
        visit_ids = [v.id for v in visits]
        billables = db.query(BillableItem).filter(
            BillableItem.visit_id.in_(visit_ids)
        ).all() if visit_ids else []
        
        # Get unique services
        services = list(set([CATEGORY_LABELS.get(b.category, b.category) for b in billables]))
        
        # Check for contract
        contract = db.query(Contract).filter(
            Contract.client_id == client.id
        ).first()
        
        if contract:
            clients_with_contracts += 1
        
        if client.status == 'active' or not client.status:
            active_clients += 1
        
        client_items.append(ClientActivityItem(
            client_id=str(client.id),
            client_name=client.full_name,
            total_assessments=len(visits),
            last_assessment_date=visits[0].created_at.strftime("%Y-%m-%d") if visits else None,
            care_level=client.care_level,
            services_identified=services[:5],  # Top 5 services
            contract_status="Active" if contract else "No Contract",
            status=client.status or "active",
        ))
    
    # Summary
    summary = f"{len(clients)} total clients in the system. "
    summary += f"{active_clients} are active, {clients_with_contracts} have contracts generated. "
    if client_items:
        avg_assessments = sum(c.total_assessments for c in client_items) / len(client_items) if client_items else 0
        summary += f"Average {avg_assessments:.1f} assessments per client."
    
    return ClientActivityReport(
        total_clients=len(clients),
        active_clients=active_clients,
        clients_with_contracts=clients_with_contracts,
        clients_pending=len(clients) - clients_with_contracts,
        clients=client_items,
        summary=summary,
        generated_at=datetime.now().isoformat(),
    )


# ============ CSV Export Endpoints ============

@router.get("/timesheet/csv")
async def export_timesheet_csv(
    weeks_back: int = Query(default=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export weekly timesheet as CSV."""
    report = await get_weekly_timesheet(weeks_back, db, current_user)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Weekly Timesheet Report"])
    writer.writerow([f"Period: {report.period_start} to {report.period_end}"])
    writer.writerow([])
    writer.writerow(["Summary"])
    writer.writerow(["Total Assessments", report.total_assessments])
    writer.writerow(["Total Clients", report.total_clients])
    writer.writerow(["Total Services Identified", report.total_services])
    writer.writerow([])
    
    # Services by category
    writer.writerow(["Services Breakdown"])
    writer.writerow(["Category", "Service Type", "Mentions", "Clients"])
    for s in report.services_by_category:
        writer.writerow([s.label, s.description, s.total_mentions, s.clients_count])
    writer.writerow([])
    
    # Assessments
    writer.writerow(["Assessments"])
    writer.writerow(["Date", "Client", "Services Count", "Services", "Status"])
    for a in report.assessments:
        writer.writerow([a["date"], a["client_name"], a["services_count"], ", ".join(a["services"]), a["status"]])
    
    output.seek(0)
    filename = f"timesheet_{report.period_start}_to_{report.period_end}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/billing/csv")
async def export_billing_csv(
    days: int = Query(default=30),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export billing report as CSV."""
    report = await get_billing_report(days, db, current_user)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(["Billing Report"])
    writer.writerow([f"Period: {report.period}"])
    writer.writerow([])
    writer.writerow(["Summary"])
    writer.writerow(["Total Assessments", report.total_assessments])
    writer.writerow(["Total Services Identified", report.total_services_identified])
    writer.writerow([])
    
    # Client billing
    writer.writerow(["Client Billing"])
    writer.writerow(["Client", "Assessment Date", "Services Count", "Contract Status", "Est. Weekly", "Est. Monthly"])
    for cb in report.client_billing:
        writer.writerow([
            cb.client_name,
            cb.assessment_date,
            cb.total_services,
            cb.contract_status,
            f"${cb.estimated_weekly:.2f}" if cb.estimated_weekly else "-",
            f"${cb.estimated_monthly:.2f}" if cb.estimated_monthly else "-",
        ])
    
    output.seek(0)
    filename = f"billing_report_{datetime.now().strftime('%Y%m%d')}.csv"
    
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
