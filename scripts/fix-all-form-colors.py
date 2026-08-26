from pathlib import Path
import shutil
import re

ROOT = Path.home() / "wasla" / "apps" / "web" / "src"
TARGET_EXTENSIONS = {".tsx", ".ts", ".jsx", ".js"}

TAG_PATTERN = re.compile(
    r"<(input|textarea|select)\b([^<>]*?)className=\"([^\"]*)\"([^<>]*?)>",
    re.DOTALL
)

TEXT_CLASS = "text-gray-900"
PLACEHOLDER_CLASS = "placeholder:text-gray-400"


def update_classes(class_string: str, tag_name: str) -> str:
    classes = class_string.split()

    if TEXT_CLASS not in classes:
        classes.append(TEXT_CLASS)

    # placeholder يفيد input و textarea أكثر
    if tag_name in {"input", "textarea"} and PLACEHOLDER_CLASS not in classes:
        classes.append(PLACEHOLDER_CLASS)

    return " ".join(classes)


def process_file(file_path: Path):
    original = file_path.read_text(encoding="utf-8")
    changed = False

    def replacer(match):
        nonlocal changed
        tag_name = match.group(1)
        before = match.group(2)
        class_value = match.group(3)
        after = match.group(4)

        new_class_value = update_classes(class_value, tag_name)

        if new_class_value != class_value:
            changed = True

        return f'<{tag_name}{before}className="{new_class_value}"{after}>'

    updated = TAG_PATTERN.sub(replacer, original)

    if changed:
        backup_path = file_path.with_suffix(file_path.suffix + ".bak")
        shutil.copy2(file_path, backup_path)
        file_path.write_text(updated, encoding="utf-8")
        return True, backup_path

    return False, None


def main():
    print("🚀 بدء التعديل الشامل لألوان الحقول...")

    files = [
        p for p in ROOT.rglob("*")
        if p.is_file() and p.suffix in TARGET_EXTENSIONS
    ]

    total_changed = 0

    for file_path in files:
        try:
            changed, backup = process_file(file_path)
            if changed:
                total_changed += 1
                print(f"✅ تم تعديل: {file_path}")
                print(f"🗂️ نسخة احتياطية: {backup}")
        except Exception as e:
            print(f"❌ خطأ في الملف: {file_path}")
            print(f"   السبب: {e}")

    print(f"\n🎉 انتهى السكريبت | الملفات المعدلة: {total_changed}")


if __name__ == "__main__":
    main()
