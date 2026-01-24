# Visit Note Templates

This directory contains DOCX templates for generating visit notes.

## Template Variables

The following variables are available in the template:

### Visit Info
- `{{ visit_date }}` - Date of the visit
- `{{ visit_duration }}` - Duration in minutes
- `{{ client_name }}` - Client's full name
- `{{ caregiver_name }}` - Caregiver's full name

### Tasks
- `{{ tasks }}` - List of tasks performed
  - `task.category` - Task category code
  - `task.description` - Task description
  - `task.duration_minutes` - Duration in minutes

### Observations
- `{{ observations }}` - Observation notes
- `{{ concerns }}` - Risks/concerns noted
- `{{ client_condition }}` - Client condition status

### Narrative
- `{{ narrative }}` - Full narrative note

## Using Templates

Templates are processed using the `python-docx` library. Place your custom
templates in this directory and reference them in the note generation service.
