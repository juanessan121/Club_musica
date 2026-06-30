"""Ejecuta los doctests de api/helpers.py como pruebas de pytest."""
import doctest
import sys
import os


def test_doctests_helpers():
    helpers_dir = os.path.join(os.path.dirname(__file__), "..", "api")
    if helpers_dir not in sys.path:
        sys.path.insert(0, helpers_dir)
    import helpers
    results = doctest.testmod(helpers, verbose=False)
    assert results.failed == 0, f"{results.failed} doctest(s) fallaron en helpers.py"
    assert results.attempted >= 14, f"Se esperaban ≥14 doctests, encontrados: {results.attempted}"
