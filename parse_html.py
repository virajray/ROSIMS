import re
import json

with open('OSINT4ALL - Start.me.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Let's chunk the html by headers or widget containers
matches = list(re.finditer(r'<h[1-6][^>]*>(.*?)</h[1-6]>', html, re.DOTALL))
headers_info = []
for m in matches:
    h_text = re.sub(r'<[^>]+>', '', m.group(1)).strip()
    h_pos = m.start()
    headers_info.append((h_pos, h_text))

print("Found headers:", len(headers_info))

categories = {}
for i in range(len(headers_info)):
    start_pos, cat_name = headers_info[i]
    end_pos = headers_info[i+1][0] if i+1 < len(headers_info) else len(html)
    chunk = html[start_pos:end_pos]
    
    # Extract links in this chunk
    links = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', chunk, re.DOTALL | re.IGNORECASE)
    tool_list = []
    seen = set()
    for href, text in links:
        clean_text = re.sub(r'<[^>]+>', '', text).strip()
        clean_text = ' '.join(clean_text.split())
        if href.startswith('http') and not 'start.me' in href and clean_text and href not in seen:
            seen.add(href)
            tool_list.append({"name": clean_text, "url": href})
            
    if tool_list and cat_name and cat_name not in ["Start.me has been updated", "Cookie policy"]:
        # Clean category name
        cat_name = ' '.join(cat_name.split())
        categories[cat_name] = tool_list

print("Categories grouped:", len(categories))
total_tools = sum(len(t) for t in categories.values())
print("Total tools categorized:", total_tools)

for cat, tools in list(categories.items())[:10]:
    print(f"[{cat}] ({len(tools)} tools): {[t['name'] for t in tools[:3]]}")

# Save categorized data to json
with open('osint_data.json', 'w', encoding='utf-8') as f:
    json.dump(categories, f, indent=2, ensure_ascii=False)

print("Saved osint_data.json successfully!")
