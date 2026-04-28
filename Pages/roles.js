document.addEventListener("DOMContentLoaded", () => {
  syncSessionUi();

  const page = document.body.dataset.page;
  if (page === "role") {
    const requiredRole = document.body.dataset.roleView || "";
    initRolePage(requiredRole);
  }
});

function initRolePage(requiredRole) {
  const session = requireRoleSession(requiredRole);
  if (!session) {
    return;
  }

  Promise.all([
    apiRequest("/api/dashboard"),
    apiRequest("/api/properties"),
    apiRequest(
      requiredRole === "Client"
        ? `/api/contact-requests?email=${encodeURIComponent(session.email)}&limit=12`
        : "/api/contact-requests?limit=20"
    ),
  ])
    .then(([dashboard, propertiesResponse, requests]) => {
      const frame = buildRoleFrame(requiredRole, {
        session,
        dashboard,
        properties: propertiesResponse.items || [],
        requests,
        history: loadViewedHistory(session.email),
      });
      renderRoleFrame(frame);
    })
    .catch((error) => {
      const title = document.getElementById("role-title");
      const description = document.getElementById("role-description");
      if (title) {
        title.textContent = "Impossible de charger cet espace";
      }
      if (description) {
        description.textContent = error.message;
      }
    });
}

function buildRoleFrame(role, context) {
  switch (role) {
    case "Client":
      return buildClientFrame(context);
    case "Agent":
      return buildAgentFrame(context);
    case "Manager":
      return buildManagerFrame(context);
    case "Admin IT":
      return buildAdminFrame(context);
    default:
      return {
        hero: {
          kicker: "Espace Ymmo",
          title: "Profil inconnu",
          description: "Aucune interface n'est definie pour ce profil.",
          badge: role || "Ymmo",
          kpis: [],
        },
        nav: ["Apercu", "Focus", "Suivi", "Actions"],
        focus: { kicker: "Focus", title: "Apercu", description: "", html: renderEmptyState("Aucune donnee disponible.") },
        side: { kicker: "Suivi", title: "Liste", description: "", html: renderEmptyState("Aucune donnee disponible.") },
        bottomLeft: { kicker: "Performance", title: "Vue", description: "", html: renderEmptyState("Aucune donnee disponible.") },
        bottomRight: { kicker: "Actions", title: "Checklist", description: "", html: renderEmptyState("Aucune donnee disponible.") },
      };
  }
}

function buildClientFrame({ session, dashboard, properties, requests, history }) {
  const recommended = properties.filter((item) => item.status === "Disponible").slice(0, 4);
  const hotspot = dashboard.hotspots?.[0];
  const historyItems = history.length ? history : recommended.slice(0, 3).map(toHistoryItem);

  return {
    hero: {
      kicker: "Espace client",
      title: `Bonjour ${session.first_name}, on vous a prepare une vue claire de votre parcours.`,
      description:
        "Retrouvez vos demandes, les biens consultes et les meilleures opportunites du moment sans repasser par la page publique.",
      badge: "Client",
      kpis: [
        { value: String(requests.count || 0), label: "demandes en suivi" },
        { value: String(history.length || 0), label: "biens consultes" },
        { value: hotspot ? hotspot.city : "Rennes", label: "ville la plus porteuse" },
        { value: formatPrice(dashboard.summary?.average_price), label: "prix moyen du parc" },
      ],
    },
    nav: ["Apercu", "Recommandations", "Historique", "Parcours"],
    focus: {
      kicker: "Selection client",
      title: "Biens recommandes pour continuer votre recherche",
      description: "Ces biens cumulent une bonne dynamique de marche et une forte attractivite.",
      html: renderPropertyHighlights(recommended, "Ouvrir le catalogue"),
    },
    side: {
      kicker: "Demandes",
      title: "Vos prises de contact",
      description: "Historique recent de vos demandes envoyees aux agences.",
      html: renderRequestList(requests.items, "Aucune demande enregistree pour le moment."),
    },
    bottomLeft: {
      kicker: "Historique",
      title: "Derniers biens consultes",
      description: "Cette liste est memorisee localement pour vous aider a reprendre facilement vos recherches.",
      html: renderHistoryCards(historyItems),
    },
    bottomRight: {
      kicker: "Parcours d'achat",
      title: "Etapes conseillees",
      description: "Un petit plan simple pour ne rien oublier jusqu'a la signature.",
      html: renderTimelineCards([
        {
          title: "Definir le budget",
          body: "Validez l'enveloppe globale avec financement, frais de notaire et marge de securite.",
        },
        {
          title: "Planifier les visites",
          body: "Ciblez les biens prioritaires et comparez quartier, transport et potentiel locatif.",
        },
        {
          title: "Monter le dossier",
          body: "Rassemblez les pieces utiles pour accelerer la reservation et la negotiation.",
        },
        {
          title: "Suivre la signature",
          body: "Gardez un point de contact unique avec l'agence jusqu'a l'acte final.",
        },
      ]),
    },
  };
}

function buildAgentFrame({ session, dashboard, properties, requests }) {
  const hotLeads = requests.items.filter((item) => ["Nouveau", "Relance", "Planifie"].includes(item.status));
  const priorityProperties = properties
    .filter((item) => item.status === "Disponible")
    .sort((left, right) => right.buyer_interest_score - left.buyer_interest_score)
    .slice(0, 4);
  const hotspot = dashboard.hotspots?.[0];

  return {
    hero: {
      kicker: "Espace agent",
      title: `${session.first_name}, voici vos priorites commerciales du jour.`,
      description:
        "L'interface agent regroupe les leads recents, les mandats a pousser et les actions utiles pour garder le rythme commercial.",
      badge: "Agent",
      kpis: [
        { value: String(hotLeads.length), label: "leads a traiter" },
        { value: String(dashboard.summary?.available_properties || 0), label: "biens disponibles" },
        { value: hotspot ? hotspot.city : "Lyon", label: "ville chaude du moment" },
        { value: `${dashboard.analytics?.average_days_on_market || 0} j`, label: "delai moyen du marche" },
      ],
    },
    nav: ["Apercu", "Leads", "Mandats", "Actions"],
    focus: {
      kicker: "Leads du jour",
      title: "Demandes a recontacter en priorite",
      description: "Les prises de contact les plus recentes sont placees en tete pour faciliter les relances.",
      html: renderRequestList(hotLeads.length ? hotLeads : requests.items, "Aucun lead recent pour le moment."),
    },
    side: {
      kicker: "Mandats prioritaires",
      title: "Biens a pousser cette semaine",
      description: "Selection basee sur l'interet acheteur et la disponibilite immediate.",
      html: renderPropertyHighlights(priorityProperties, "Voir le bien"),
    },
    bottomLeft: {
      kicker: "Actions du jour",
      title: "Routine commerciale",
      description: "Un cadre simple pour garder le pipe commercial propre.",
      html: renderTimelineCards([
        {
          title: "Rappeler les leads nouveaux",
          body: "Traiter d'abord les demandes du matin et planifier les visites avant la fin de journee.",
        },
        {
          title: "Verifier les dossiers chauds",
          body: "Confirmer financement, disponibilites et objections restantes sur les biens sous tension.",
        },
        {
          title: "Mettre a jour le suivi",
          body: "Completer les commentaires apres chaque echange pour garder une vision nette en equipe.",
        },
      ]),
    },
    bottomRight: {
      kicker: "Prospection",
      title: "Zones a remettre en avant",
      description: "Villes et actifs utiles pour vos prochaines prises de contact.",
      html: renderHotspotCards(dashboard.hotspots || []),
    },
  };
}

function buildManagerFrame({ session, dashboard, properties, requests }) {
  const underOfferCount = properties.filter((item) => item.status === "Sous offre").length;
  const arbitrationQueue = requests.items.filter((item) => ["Relance", "Planifie", "Qualifie"].includes(item.status));
  const statusCards = Object.entries(requests.status_counts || {}).map(([name, count]) => ({
    title: name,
    body: `${count} dossier(s) actuellement dans cet etat.`,
    accent: "status",
  }));
  const agencyCards = (requests.top_agencies || []).map((item) => ({
    title: item.agency_name,
    body: `${item.request_count} demande(s) recentes a suivre.`,
    accent: "agency",
  }));

  return {
    hero: {
      kicker: "Espace manager",
      title: `${session.first_name}, voici la vue de pilotage reseau et pipeline.`,
      description:
        "L'espace manager met l'accent sur la charge commerciale, les arbitrages a faire et les zones ou l'activite doit etre renforcee.",
      badge: "Manager",
      kpis: [
        { value: String(requests.count || 0), label: "demandes recentes" },
        { value: String(underOfferCount), label: "biens sous offre" },
        { value: String(dashboard.network?.agency_count || 0), label: "agences actives" },
        { value: `${dashboard.analytics?.average_interest || 0}/100`, label: "interet moyen acheteur" },
      ],
    },
    nav: ["Apercu", "Pilotage", "Performance", "Revue"],
    focus: {
      kicker: "Pilotage commercial",
      title: "Vue synthese du pipeline",
      description: "Repartition des demandes recentes et agences les plus sollicitees.",
      html: renderSummaryCards(statusCards.concat(agencyCards), "Aucune activite a signaler."),
    },
    side: {
      kicker: "Arbitrage",
      title: "Demandes a surveiller",
      description: "Les dossiers en relance, qualifies ou planifies meritent un suivi rapproché.",
      html: renderRequestList(arbitrationQueue.length ? arbitrationQueue : requests.items, "Aucun arbitrage prioritaire."),
    },
    bottomLeft: {
      kicker: "Performance",
      title: "Villes et agences a observer",
      description: "Combinaison des signaux marche et de la charge commerciale recente.",
      html: renderHotspotCards(dashboard.hotspots || []).concat(renderSummaryCards(agencyCards, "Aucune agence active.")),
    },
    bottomRight: {
      kicker: "Revue hebdo",
      title: "Points manager a maintenir",
      description: "Une cadence de pilotage simple pour garder le reseau aligne.",
      html: renderTimelineCards([
        {
          title: "Revue des leads critiques",
          body: "Passer les dossiers en attente de retour financier ou de validation client.",
        },
        {
          title: "Point agences",
          body: "Verifier la capacite de chaque agence a absorber les demandes et redistribuer si besoin.",
        },
        {
          title: "Suivi des villes chaudes",
          body: "Comparer prix, rendement et temps de vente pour ajuster la priorisation commerciale.",
        },
      ]),
    },
  };
}

function buildAdminFrame({ session, dashboard }) {
  const sites = dashboard.network?.sites || [];
  const vpnActiveCount = sites.filter((site) => Number(site.vpn_enabled) === 1).length;

  return {
    hero: {
      kicker: "Espace admin IT",
      title: `${session.first_name}, voici votre vue supervision et securite.`,
      description:
        "L'espace admin IT isole les sujets infrastructure: sites connectes, services critiques, securite et routine de supervision.",
      badge: "Admin IT",
      kpis: [
        { value: String(sites.length), label: "sites supervises" },
        { value: String(dashboard.network?.total_workstations || 0), label: "postes relies" },
        { value: String(vpnActiveCount), label: "liaisons VPN actives" },
        { value: "24/7", label: "supervision cible" },
      ],
    },
    nav: ["Apercu", "Supervision", "Reseau", "Securite"],
    focus: {
      kicker: "Services critiques",
      title: "Etat cible des briques techniques",
      description: "Vision resumee des elements essentiels a la soutenance et au run quotidien.",
      html: renderServiceCards([
        { name: "Web Ymmo", status: "Operationnel", detail: "Serveur web central accessible et catalogue servi en local." },
        { name: "Base SQLite", status: "Operationnel", detail: "Donnees biens, utilisateurs et demandes disponibles." },
        { name: "AD / GPO", status: "A presenter", detail: "Bloc prevu dans la partie infra et securisation du reseau." },
        { name: "Sauvegardes", status: "Planifie", detail: "Rotation quotidienne et copie externalisee a formaliser dans la doc." },
      ]),
    },
    side: {
      kicker: "Reseau",
      title: "Sites principaux",
      description: "Extrait du reseau siege et agences pour garder la topologie visible.",
      html: renderNetworkCards(sites.slice(0, 4)),
    },
    bottomLeft: {
      kicker: "Couverture",
      title: "Inventaire reseau",
      description: "Chaque site reprend son type, sa charge poste et sa note d'exploitation.",
      html: renderSiteRows(sites),
    },
    bottomRight: {
      kicker: "Securite et runbook",
      title: "Checklist admin IT",
      description: "Les points qui structurent bien la partie infra devant le jury.",
      html: renderTimelineCards([
        {
          title: "Verifier la supervision",
          body: "Surveiller connectivite des sites, charge des serveurs et disponibilite du service web.",
        },
        {
          title: "Controler les sauvegardes",
          body: "Confirmer l'execution quotidienne et documenter le chemin de restauration.",
        },
        {
          title: "Revoir les acces",
          body: "Valider la matrice des droits, les groupes AD et la coherences des profils a presenter.",
        },
        {
          title: "Preparer le PRA",
          body: "Lister les services critiques, l'ordre de reprise et l'option cloud proposee.",
        },
      ]),
    },
  };
}

function renderRoleFrame(frame) {
  setText("role-kicker", frame.hero.kicker);
  setText("role-title", frame.hero.title);
  setText("role-description", frame.hero.description);
  setText("role-badge", frame.hero.badge);
  setHtml("role-kpis", renderKpiCards(frame.hero.kpis));

  setText("nav-overview-label", frame.nav[0]);
  setText("nav-focus-label", frame.nav[1]);
  setText("nav-detail-label", frame.nav[2]);
  setText("nav-actions-label", frame.nav[3]);

  setText("focus-kicker", frame.focus.kicker);
  setText("focus-title", frame.focus.title);
  setText("focus-description", frame.focus.description);
  setHtml("focus-content", frame.focus.html);

  setText("side-kicker", frame.side.kicker);
  setText("side-title", frame.side.title);
  setText("side-description", frame.side.description);
  setHtml("side-content", frame.side.html);

  setText("bottom-left-kicker", frame.bottomLeft.kicker);
  setText("bottom-left-title", frame.bottomLeft.title);
  setText("bottom-left-description", frame.bottomLeft.description);
  setHtml("bottom-left-content", frame.bottomLeft.html);

  setText("bottom-right-kicker", frame.bottomRight.kicker);
  setText("bottom-right-title", frame.bottomRight.title);
  setText("bottom-right-description", frame.bottomRight.description);
  setHtml("bottom-right-content", frame.bottomRight.html);
}
