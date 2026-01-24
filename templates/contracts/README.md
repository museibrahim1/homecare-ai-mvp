# Contract Templates

This directory contains DOCX templates for generating service contracts.

## Template Variables

The following variables are available in the template:

### Client Info
- `{{ client_name }}` - Client's full name
- `{{ client_address }}` - Client's address
- `{{ client_phone }}` - Client's phone number
- `{{ emergency_contact }}` - Emergency contact name
- `{{ emergency_phone }}` - Emergency contact phone

### Services
- `{{ services }}` - List of services
  - `service.name` - Service name
  - `service.description` - Service description

### Schedule
- `{{ schedule_days }}` - Days of service
- `{{ schedule_hours }}` - Hours per visit

### Rates
- `{{ hourly_rate }}` - Hourly rate
- `{{ weekly_hours }}` - Weekly hours
- `{{ weekly_cost }}` - Weekly cost estimate
- `{{ monthly_cost }}` - Monthly cost estimate

### Terms
- `{{ start_date }}` - Contract start date
- `{{ end_date }}` - Contract end date
- `{{ cancellation_policy }}` - Cancellation policy text

### Signatures
- `{{ client_signature_line }}` - Client signature placeholder
- `{{ agency_signature_line }}` - Agency signature placeholder

## Using Templates

Templates are processed using the `python-docx` library. Place your custom
templates in this directory and reference them in the contract generation service.
