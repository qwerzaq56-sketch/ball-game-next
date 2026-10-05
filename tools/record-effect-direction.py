"""Record preserved generated concepts; no image retouching or generation."""
from pathlib import Path
import hashlib, json
from PIL import Image

root = Path(__file__).resolve().parents[1]
base = root / 'planning/art-concepts/effect-direction-v2'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
items = []
for name, original in [
    ('combat-002', 'exec-c100b170-8865-4f3b-af3b-85b5fb5676a3.png'),
    ('abilities-002', 'exec-3148f695-4c54-4b11-bd75-182079e3dab5.png'),
    ('absorption-003', 'exec-17fabcfe-91ec-43b5-b24d-f6556ea60e3e.png'),
]:
    image = base / (name + '.png')
    prompt = base / (name + '-prompt.md')
    items.append(dict(id=name, file=image.name, size=Image.open(image).size,
                      sha256=sha(image), prompt=prompt.name, promptSha256=sha(prompt),
                      generatedOriginal=original,
                      reference='references/empowerment-application.png + original ally-buffs-001.png',
                      generator='built-in image_gen'))
(base / 'concept-manifest.json').write_text(json.dumps(dict(
    source='ally-buffs-001.png', sourceSha256=sha(root/'planning/art-concepts/ally-buffs-001.png'),
    userAttachmentMatchesSource=True, items=items,
    selectionNotes=['combat-002 absorption row rejected: ambiguous flow/recipient arc; use absorption-003 instead',
                    'Concept creation is not runtime asset acceptance; exact crop and actual scene verification follow']),
    ensure_ascii=False, indent=2), encoding='utf-8')
print('Recorded', len(items), 'concepts; originals unchanged')
