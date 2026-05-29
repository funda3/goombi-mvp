# Goombi Data Pipeline

TripAdvisor scraper + Neon database + Google Places enrichment.
Builds and maintains Goombi SA venue database across Gauteng, Western Cape, and KZN.

## Quick start

### 1. Provision Neon
1. Go to neon.tech and create a project named goombi.
2. Create a database named goombi.
3. Copy the connection string.

### 2. Configure environment
```powershell
Copy-Item .env.example .env
# Edit .env and paste your DATABASE_URL
```

### 3. Install dependencies
```powershell
pip install -r requirements.txt
```

### 4. Apply schema
```powershell
python scraper.py --setup-schema
```

## Running the scraper

### Test run
```powershell
python scraper.py --province gauteng --max-pages 3
```

### Full province scrape (skeleton rows)
```powershell
python scraper.py --province gauteng
python scraper.py --province western_cape
python scraper.py --province kwazulu_natal
```

### Deep scrape
```powershell
python scraper.py --province gauteng --deep
```

### All provinces
```powershell
python scraper.py --all
```

## Google Places enrichment (optional)

```powershell
python enrich_google.py --province gauteng --limit 200
python enrich_google.py --all --limit 500
```

## Weekly refresh

```powershell
python refresh.py --all --stale-days 7 --batch-size 100
```

## File structure

```text
goombi/
|- schema.sql
|- config.py
|- db.py
|- scraper.py
|- enrich_google.py
|- refresh.py
|- requirements.txt
|- .env.example
\- README.md
```
