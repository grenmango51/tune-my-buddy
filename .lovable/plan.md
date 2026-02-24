
# LLM Fine-Tuning Dashboard — Prototype UI

A clean, minimal dashboard for ML engineers to monitor and manage LLM fine-tuning jobs. This is a **frontend-only prototype** with mock data (no backend).

## Pages & Features

### 1. Dashboard (Home)
- **Overview cards**: Total jobs, running, completed, failed
- **Recent jobs table**: Model name, base model, status, started/completed time, quick actions
- **Training metrics sparklines**: Loss curves for active jobs at a glance

### 2. Job Detail Page
- **Training metrics charts** (using Recharts): Training loss, validation loss, learning rate over steps/epochs
- **Configuration summary**: Hyperparameters (learning rate, batch size, epochs, LoRA rank, etc.)
- **Dataset info**: Dataset name, size, sample preview
- **Logs panel**: Scrollable training log output
- **Status badge & progress bar**

### 3. New Fine-Tune Job (Create/Config)
- **Step-by-step form**:
  1. Select base model (dropdown: Llama 3, Mistral, etc.)
  2. Upload/select dataset (mock file picker)
  3. Configure hyperparameters (with sensible defaults)
  4. Review & launch
- Clean form layout with tooltips explaining each parameter

### 4. Models Library
- **List of fine-tuned models** with metadata (base model, performance metrics, creation date)
- Status indicators (ready, training, failed)
- Actions: View details, compare, deploy (mock)

## Layout & Navigation
- **Sidebar** with icons: Dashboard, Jobs, Models, New Job
- Clean minimal design with subtle borders, good typography
- Dark/light mode toggle
- All data is **mock/hardcoded** for prototyping purposes

## Design Principles
- Monochrome with accent color for status indicators
- Generous whitespace, clear hierarchy
- Tables and charts as primary data display patterns
- Responsive but desktop-first (ML engineers work on large screens)
