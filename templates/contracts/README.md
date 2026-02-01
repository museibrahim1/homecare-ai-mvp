# Contract Templates

This directory contains DOCX templates for generating service contracts.

## How to Use Templates

1. Create a DOCX file with placeholders using the formats below
2. Upload it in Settings > Documents > Contract Template
3. When exporting contracts, your template will be filled with client data

## Supported Placeholder Formats

The system supports multiple placeholder formats for flexibility:

- `{placeholder}` - Standard braces
- `{{placeholder}}` - Double braces
- `[placeholder]` - Square brackets
- `[[placeholder]]` - Double square brackets
- `Label: _____` - Label followed by blanks (auto-filled)

All placeholders are **case-insensitive**.

## Available Placeholders

### Dates
| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{date}` | Today's date | January 29, 2026 |
| `{contract_date}` | Contract date | January 29, 2026 |
| `{effective_date}` | Effective date | January 29, 2026 |
| `{today}` | Today's date | January 29, 2026 |
| `{current_date}` | Current date | January 29, 2026 |

### Agency Information
| Placeholder | Description |
|-------------|-------------|
| `{agency_name}` | Agency name |
| `{agency}` | Agency name |
| `{company_name}` | Agency/company name |
| `{provider_name}` | Provider name |
| `{agency_address}` | Full agency address |
| `{agency_street}` | Street address |
| `{agency_city}` | City |
| `{agency_state}` | State |
| `{agency_zip}` | ZIP code |
| `{agency_phone}` | Phone number |
| `{agency_email}` | Email address |

### Client Information
| Placeholder | Description |
|-------------|-------------|
| `{client_name}` | Client's full name |
| `{client}` | Client's full name |
| `{patient_name}` | Patient name (alias) |
| `{patient}` | Patient name (alias) |
| `{client_first_name}` | Client's first name |
| `{client_last_name}` | Client's last name |
| `{client_address}` | Full address |
| `{client_street}` | Street address |
| `{client_city}` | City |
| `{client_state}` | State |
| `{client_zip}` | ZIP code |
| `{client_phone}` | Phone number |
| `{home_phone}` | Home phone |
| `{work_phone}` | Work phone |
| `{cell_phone}` | Cell phone |
| `{client_email}` | Email address |
| `{date_of_birth}` | Date of birth |
| `{dob}` | Date of birth |
| `{emergency_contact}` | Emergency contact name |
| `{emergency_contact_name}` | Emergency contact name |
| `{emergency_phone}` | Emergency contact phone |
| `{emergency_contact_phone}` | Emergency contact phone |

### Care Assessment
| Placeholder | Description |
|-------------|-------------|
| `{care_level}` | Care need level |
| `{care_need_level}` | Care need level |
| `{primary_diagnosis}` | Primary diagnosis |
| `{diagnosis}` | Primary diagnosis |
| `{mobility_status}` | Mobility status |
| `{mobility}` | Mobility status |
| `{cognitive_status}` | Cognitive status |
| `{living_situation}` | Living situation |

### Services
| Placeholder | Description |
|-------------|-------------|
| `{services}` | Formatted list of services |
| `{services_list}` | Formatted list of services |

### Schedule
| Placeholder | Description |
|-------------|-------------|
| `{schedule_days}` | Days of service |
| `{days}` | Days of service |
| `{preferred_days}` | Preferred days |
| `{schedule_time}` | Preferred time |
| `{preferred_time}` | Preferred time |
| `{time}` | Preferred time |
| `{frequency}` | Service frequency |
| `{weekly_hours}` | Hours per week |
| `{hours_per_week}` | Hours per week |

### Rates & Billing
| Placeholder | Description | Example |
|-------------|-------------|---------|
| `{hourly_rate}` | Hourly rate with $ | $35.00 |
| `{hourly_rate_value}` | Hourly rate (number only) | 35.00 |
| `{rate}` | Hourly rate with $ | $35.00 |
| `{rate_value}` | Rate (number only) | 35.00 |
| `{weekly_cost}` | Weekly cost estimate | $420.00 |
| `{weekly_estimate}` | Weekly estimate | $420.00 |
| `{monthly_cost}` | Monthly cost estimate | $1,818.60 |
| `{monthly_estimate}` | Monthly estimate | $1,818.60 |
| `{weekday_rate}` | Weekday rate (number) | 35.00 |
| `{weekend_rate}` | Weekend rate (+25%) | 43.75 |
| `{holiday_rate}` | Holiday rate (+50%) | 52.50 |

### Requirements & Safety
| Placeholder | Description |
|-------------|-------------|
| `{special_requirements}` | Special requirements list |
| `{requirements}` | Special requirements |
| `{safety_concerns}` | Safety concerns list |
| `{safety}` | Safety concerns |

### Contract
| Placeholder | Description |
|-------------|-------------|
| `{contract_id}` | Contract UUID |

## Label-Based Auto-Fill

The system can also auto-fill fields that follow a "Label:" pattern in your document:

- `Name: ___________` → Auto-filled with client name
- `Address: _________` → Auto-filled with client address
- `Phone: ___________` → Auto-filled with client phone
- `Date of Birth: ___` → Auto-filled with DOB
- `Hourly Rate: _____` → Auto-filled with rate
- `Weekly Hours: ____` → Auto-filled with hours

## Example Template

```
SERVICE AGREEMENT

Date: {date}

PROVIDER:
{agency_name}
{agency_address}
Phone: {agency_phone}

CLIENT:
Name: {client_name}
Address: {client_address}
Phone: {client_phone}
Emergency Contact: {emergency_contact} - {emergency_phone}

SERVICES TO BE PROVIDED:
{services}

SCHEDULE:
Days: {schedule_days}
Hours per week: {weekly_hours}

RATES:
Hourly Rate: {hourly_rate}
Estimated Weekly Cost: {weekly_cost}
Estimated Monthly Cost: {monthly_cost}

_____________________          _____________________
Client Signature               Date

_____________________          _____________________
Provider Signature             Date
```

## Tips for Best Results

1. **Use simple formatting** - Complex tables may not fill correctly
2. **Test with a sample client** - Export a contract to verify placeholders work
3. **Keep backups** - Save your original template before uploading
4. **Use DOCX format** - DOC, PDF, and other formats are not supported
