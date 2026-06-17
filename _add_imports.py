import os, sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

components_dir = "src/components"
files_to_update = [
    'AlertSystemTab.tsx', 'AnggaranAlokasiTab.tsx', 'BackupSystemTab.tsx',
    'BepTab.tsx', 'BomTab.tsx', 'BranchDashboard.tsx', 'ChatTab.tsx',
    'ComplianceSafetyTab.tsx', 'DataPusatTab.tsx', 'EnterpriseDashboard.tsx',
    'FefoExpiryTab.tsx', 'HargaHppTab.tsx', 'LaporanKeuanganTab.tsx',
    'MaterialsTab.tsx', 'PosKasirTab.tsx', 'ProductionCenterTab.tsx',
    'RecipesTab.tsx', 'SmartKitchenTab.tsx', 'RdSandboxTab.tsx', 'ToppingsTab.tsx'
]

count = 0
for fname in files_to_update:
    fpath = os.path.join(components_dir, fname)
    if not os.path.exists(fpath):
        continue
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if showConfirm is already imported
    if 'showConfirm' in content:
        print(f"SKIP (already has import): {fname}")
        continue
    
    # Check if ConfirmModal is already imported
    if 'ConfirmModal' in content:
        print(f"SKIP (has ConfirmModal): {fname}")
        continue
    
    # Check if it uses showConfirm at all
    if 'showConfirm' not in content:
        print(f"SKIP (no showConfirm usage): {fname}")
        continue
    
    # Find existing imports from '../types' or '../lib' and add after
    # Looking for the last import line
    lines = content.split('\n')
    insert_pos = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            insert_pos = i
    
    if insert_pos >= 0:
        indent = ''
        if lines[insert_pos].startswith(' '):
            indent = lines[insert_pos][:len(lines[insert_pos]) - len(lines[insert_pos].lstrip())]
        lines.insert(insert_pos + 1, f"{indent}import {{ showConfirm }} from '../components/ConfirmModal';")
        new_content = '\n'.join(lines)
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"ADDED import: {fname}")
        count += 1

print(f"\nTotal files updated with import: {count}")
