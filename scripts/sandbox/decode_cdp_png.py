import base64, json, sys, os

json_path = sys.argv[1]
out_path = sys.argv[2]

with open(json_path) as f:
    data = json.load(f)

# CDP response shape may vary; find the base64 'data' field
b64 = None
if isinstance(data, dict):
    if "data" in data:
        b64 = data["data"]
    elif "result" in data and isinstance(data["result"], dict) and "data" in data["result"]:
        b64 = data["result"]["data"]
if b64 is None:
    raise SystemExit("Could not find base64 data field in %s. Keys: %s" % (json_path, list(data.keys())))

raw = base64.b64decode(b64)
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "wb") as f:
    f.write(raw)
print("%s %d" % (out_path, len(raw)))
