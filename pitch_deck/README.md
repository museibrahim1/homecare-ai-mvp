## Pitch deck

- **Deck file**: `pitch_deck/deck.md`
- **Screenshots**: `pitch_deck/screenshots/`
- **PowerPoint export (no browser)**: `pitch_deck/Homecare-AI-Pitch-Deck.pptx`

### View

Open `pitch_deck/deck.md` in Cursor/GitHub to view the slides in Markdown.

### Export to PowerPoint (recommended if you don't have a browser)

This generates a `.pptx` using the screenshots (no browser required):

```bash
python3 -m pip install --user python-pptx pillow
python3 pitch_deck/export_pptx.py
```

### Export to PDF (optional)

If you have Node installed, you can export using Marp:

```bash
npx @marp-team/marp-cli@latest pitch_deck/deck.md --pdf --allow-local-files
```

This will generate `deck.pdf` next to the markdown file.

