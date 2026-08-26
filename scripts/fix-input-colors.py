from pathlib import Path
import shutil

ROOT = Path.home() / "wasla"

FILES = {
    ROOT / "apps" / "web" / "src" / "app" / "page.tsx": [
        (
            'className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"',
            'className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"',
        ),
        (
            'className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"',
            'className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"',
        ),
    ],
    ROOT / "apps" / "web" / "src" / "app" / "conversations" / "[id]" / "page.tsx": [
        (
            'className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"',
            'className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"',
        ),
    ],
    ROOT / "apps" / "web" / "src" / "app" / "login" / "page.tsx": [
        (
            'className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
            'className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"',
        ),
        (
            'className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"',
            'className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-10"',
        ),
    ],
}

def main():
    print("🚀 بدء تعديل ألوان inputs/textarea ...")
    total_changes = 0

    for file_path, replacements in FILES.items():
        if not file_path.exists():
            print(f"⚠️ الملف غير موجود: {file_path}")
            continue

        backup_path = file_path.with_suffix(file_path.suffix + ".bak")
        shutil.copy2(file_path, backup_path)

        content = file_path.read_text(encoding="utf-8")
        original_content = content

        file_changes = 0
        for old, new in replacements:
            occurrences = content.count(old)
            if occurrences > 0:
                content = content.replace(old, new)
                file_changes += occurrences

        if content != original_content:
            file_path.write_text(content, encoding="utf-8")
            print(f"✅ تم تعديل {file_path} | عدد التغييرات: {file_changes}")
            print(f"🗂️ نسخة احتياطية: {backup_path}")
            total_changes += file_changes
        else:
            print(f"ℹ️ لا يوجد تغيير مطلوب في: {file_path}")

    print(f"\n🎉 انتهى السكربت | مجموع التغييرات: {total_changes}")

if __name__ == "__main__":
    main()
