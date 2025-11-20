from pathlib import Path


def main() -> None:
    path = Path("database_setup.sql")
    text = path.read_text(encoding="utf-8")

    old_header = "-- Выполните этот скрипт в Supabase SQL Editor"
    new_header = "-- Выполните этот скрипт в стандартном PostgreSQL (psql или любой клиент)"
    if old_header in text:
        text = text.replace(old_header, new_header, 1)

    sec3_header = (
        "-- ================================================\r\n"
        "-- 3. НАСТРОЙКА ROW LEVEL SECURITY (RLS)\r\n"
        "-- ================================================\r\n"
    )
    sec5_header = (
        "-- ================================================\r\n"
        "-- 5. СОЗДАНИЕ ТРИГГЕРОВ"
    )

    if sec3_header in text and sec5_header in text:
        start = text.index(sec3_header)
        end = text.index(sec5_header)
        new_section = (
            "-- ================================================\r\n"
            "-- 3. ПРИМЕЧАНИЕ ПО БЕЗОПАСНОСТИ\r\n"
            "-- ================================================\r\n"
            "-- В чистом PostgreSQL настройте роли, привилегии и политики доступа самостоятельно.\r\n"
            "-- При необходимости добавьте соответствующие GRANT/REVOKE или политики RLS позднее.\r\n"
            "\r\n"
        )
        text = text[:start] + new_section + text[end:]

    footer = (
        "-- Проверка RLS политик\r\n"
        "SELECT tablename, policyname \r\n"
        "FROM pg_policies \r\n"
        "WHERE schemaname = 'public' \r\n"
        "ORDER BY tablename, policyname;\r\n"
        "\r\n"
    )

    text = text.replace(footer, "")
    path.write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()

