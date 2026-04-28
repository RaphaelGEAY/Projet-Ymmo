import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from Backend.database import Database
from Backend.repositories import PropertyRepository


def main() -> None:
    repository = PropertyRepository(Database())
    report = repository.get_market_overview()

    summary = report["summary"]
    analytics = report["analytics"]

    print("YMMO MARKET REPORT")
    print("==================")
    print("Biens totaux:", summary["total_properties"])
    print("Biens disponibles:", summary["available_properties"])
    print("Prix moyen:", summary["average_price"], "EUR")
    print("Surface moyenne:", summary["average_surface"], "m2")
    print("Vues moyennes:", analytics["average_views"])
    print("Interet acheteur moyen:", analytics["average_interest"])
    print("Delai moyen estime:", analytics["average_days_on_market"], "jours")
    print()
    print("Villes a surveiller:")
    for city in report["hotspots"]:
        print(
            f"- {city['city']}: score {city['interest_score']}, "
            f"rendement {city['rent_yield']}%, prix moyen {city['average_price']} EUR"
        )


if __name__ == "__main__":
    main()
