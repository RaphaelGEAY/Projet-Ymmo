PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO roles (name, description) VALUES
  ('Client', 'Acheteur ou vendeur de biens'),
  ('Agent', 'Agent commercial en agence'),
  ('Manager', 'Responsable agence'),
  ('Admin IT', 'Administration technique');

INSERT OR IGNORE INTO agencies (name, city, region, phone, email) VALUES
  ('Siege Aix', 'Aix-en-Provence', 'PACA', '04 42 00 00 00', 'aix@ymmo.fr'),
  ('Agence Paris Centre', 'Paris', 'Ile-de-France', '01 82 00 00 00', 'paris@ymmo.fr'),
  ('Agence Lyon Presqu ile', 'Lyon', 'Auvergne-Rhone-Alpes', '04 78 00 00 00', 'lyon@ymmo.fr'),
  ('Agence Marseille Vieux Port', 'Marseille', 'PACA', '04 91 00 00 00', 'marseille@ymmo.fr'),
  ('Agence Lille Centre', 'Lille', 'Hauts-de-France', '03 20 00 00 00', 'lille@ymmo.fr'),
  ('Agence Bordeaux Chartrons', 'Bordeaux', 'Nouvelle-Aquitaine', '05 56 00 00 00', 'bordeaux@ymmo.fr'),
  ('Agence Nantes Erdre', 'Nantes', 'Pays de la Loire', '02 40 00 00 00', 'nantes@ymmo.fr'),
  ('Agence Toulouse Capitole', 'Toulouse', 'Occitanie', '05 61 00 00 00', 'toulouse@ymmo.fr'),
  ('Agence Nice Massena', 'Nice', 'PACA', '04 93 00 00 00', 'nice@ymmo.fr'),
  ('Agence Strasbourg Europe', 'Strasbourg', 'Grand Est', '03 88 00 00 00', 'strasbourg@ymmo.fr'),
  ('Agence Montpellier Ecusson', 'Montpellier', 'Occitanie', '04 67 00 00 00', 'montpellier@ymmo.fr'),
  ('Agence Rennes Gare', 'Rennes', 'Bretagne', '02 99 00 00 00', 'rennes@ymmo.fr'),
  ('Agence Grenoble Bastille', 'Grenoble', 'Auvergne-Rhone-Alpes', '04 76 00 00 00', 'grenoble@ymmo.fr');

INSERT INTO users (first_name, last_name, email, phone, password_hash)
VALUES (
  'Alex',
  'Durand',
  'alex.durand@ymmo.fr',
  '06 12 34 56 78',
  'pbkdf2_sha256$120000$OY-dY43UIh4aYNX-BnHAZg$fVUoZyaOcSFL9IRbcQzSYxrNgrh4Tlf-D6qfevONXpk'
)
ON CONFLICT(email) DO UPDATE SET
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  phone = excluded.phone,
  password_hash = excluded.password_hash;

INSERT INTO users (first_name, last_name, email, phone, password_hash)
VALUES (
  'Lea',
  'Martin',
  'lea.martin@ymmo.fr',
  '06 20 44 11 09',
  'pbkdf2_sha256$120000$gn9pduiIiKqDVApeEhiXjw$Jdvj0GBhlG3Mom6KXwlG1DSWa7Hwvmlbz6YOU-IQezE'
)
ON CONFLICT(email) DO UPDATE SET
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  phone = excluded.phone,
  password_hash = excluded.password_hash;

INSERT INTO users (first_name, last_name, email, phone, password_hash)
VALUES (
  'Nina',
  'Bernard',
  'client.demo@ymmo.fr',
  '06 51 18 72 33',
  'pbkdf2_sha256$120000$hzRb5gofIxXRM0TjpeYK2g$rV6yyF165BUfpGV0tGQMmo692frBTVsBhMn83Z_R-9A'
)
ON CONFLICT(email) DO UPDATE SET
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  phone = excluded.phone,
  password_hash = excluded.password_hash;

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users, roles
WHERE users.email = 'alex.durand@ymmo.fr'
  AND roles.name = 'Agent';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users, roles
WHERE users.email = 'lea.martin@ymmo.fr'
  AND roles.name = 'Manager';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users, roles
WHERE users.email = 'client.demo@ymmo.fr'
  AND roles.name = 'Client';

INSERT OR IGNORE INTO properties (
  reference,
  title,
  type,
  city,
  postal_code,
  price,
  surface_m2,
  rooms,
  status,
  description,
  energy_class,
  agency_id
) VALUES (
  'YM-AX12',
  'Villa Marceau',
  'Maison',
  'Aix-en-Provence',
  '13100',
  690000,
  180,
  5,
  'Disponible',
  'Jardin, piscine, garage double et bureau independant.',
  'B',
  (SELECT id FROM agencies WHERE name = 'Siege Aix')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-LY07',
  'Loft Lumiere',
  'Appartement',
  'Lyon',
  '69002',
  445000,
  95,
  3,
  'Disponible',
  'Balcon filant, ascenseur et vue Saone.',
  'C',
  (SELECT id FROM agencies WHERE name = 'Agence Lyon Presqu ile')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-NA04',
  'Bureaux Horizon',
  'Local professionnel',
  'Nantes',
  '44000',
  1150000,
  350,
  8,
  'Disponible',
  'Plateau open space, six salles de reunion et acces tram.',
  'A',
  (SELECT id FROM agencies WHERE name = 'Agence Nantes Erdre')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-PA19',
  'Appartement Botanique',
  'Appartement',
  'Paris',
  '75005',
  820000,
  74,
  3,
  'Sous offre',
  'Luminosite exceptionnelle et double sejour proche jardins.',
  'D',
  (SELECT id FROM agencies WHERE name = 'Agence Paris Centre')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-MA03',
  'Maison Calanques',
  'Maison',
  'Marseille',
  '13008',
  540000,
  120,
  4,
  'Disponible',
  'Terrasse plein sud, quartier calme et garage.',
  'C',
  (SELECT id FROM agencies WHERE name = 'Agence Marseille Vieux Port')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-LI22',
  'Plateau Lumiere',
  'Local professionnel',
  'Lille',
  '59000',
  980000,
  280,
  6,
  'Disponible',
  'Plateau modulable proche metro, ideal cabinet ou startup.',
  'B',
  (SELECT id FROM agencies WHERE name = 'Agence Lille Centre')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-BX15',
  'Maison Garonne',
  'Maison',
  'Bordeaux',
  '33000',
  615000,
  142,
  5,
  'Disponible',
  'Patio, cave a vin et acces tram en moins de cinq minutes.',
  'B',
  (SELECT id FROM agencies WHERE name = 'Agence Bordeaux Chartrons')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-TO11',
  'Campus Capitole',
  'Local professionnel',
  'Toulouse',
  '31000',
  760000,
  210,
  7,
  'Disponible',
  'Showroom et bureaux avec salle de formation integree.',
  'A',
  (SELECT id FROM agencies WHERE name = 'Agence Toulouse Capitole')
);

INSERT OR IGNORE INTO properties (
  reference, title, type, city, postal_code, price, surface_m2, rooms, status,
  description, energy_class, agency_id
) VALUES (
  'YM-RN09',
  'Appartement Republique',
  'Appartement',
  'Rennes',
  '35000',
  298000,
  62,
  3,
  'Disponible',
  'Dernier etage, balcon et forte demande locative.',
  'C',
  (SELECT id FROM agencies WHERE name = 'Agence Rennes Gare')
);

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Villa Marceau', 1
FROM properties
WHERE reference = 'YM-AX12';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Loft Lumiere', 1
FROM properties
WHERE reference = 'YM-LY07';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Bureaux Horizon', 1
FROM properties
WHERE reference = 'YM-NA04';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Appartement Botanique', 1
FROM properties
WHERE reference = 'YM-PA19';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Maison Calanques', 1
FROM properties
WHERE reference = 'YM-MA03';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Plateau Lumiere', 1
FROM properties
WHERE reference = 'YM-LI22';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Maison Garonne', 1
FROM properties
WHERE reference = 'YM-BX15';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Campus Capitole', 1
FROM properties
WHERE reference = 'YM-TO11';

INSERT OR IGNORE INTO property_media (property_id, url, alt_text, is_primary)
SELECT id, '', 'Appartement Republique', 1
FROM properties
WHERE reference = 'YM-RN09';

INSERT OR IGNORE INTO property_metrics (
  property_id,
  monthly_views,
  buyer_interest_score,
  estimated_days_on_market,
  estimated_rent_yield,
  district_score
)
SELECT id, 146, 88, 27, 4.1, 8.8
FROM properties
WHERE reference = 'YM-AX12';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 192, 91, 18, 4.9, 9.0
FROM properties
WHERE reference = 'YM-LY07';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 84, 66, 42, 6.3, 7.5
FROM properties
WHERE reference = 'YM-NA04';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 173, 82, 22, 3.8, 8.4
FROM properties
WHERE reference = 'YM-PA19';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 137, 79, 26, 4.6, 8.3
FROM properties
WHERE reference = 'YM-MA03';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 61, 58, 48, 6.8, 7.1
FROM properties
WHERE reference = 'YM-LI22';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 118, 76, 31, 4.7, 8.1
FROM properties
WHERE reference = 'YM-BX15';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 105, 73, 35, 5.9, 7.8
FROM properties
WHERE reference = 'YM-TO11';

INSERT OR IGNORE INTO property_metrics (
  property_id, monthly_views, buyer_interest_score, estimated_days_on_market,
  estimated_rent_yield, district_score
)
SELECT id, 211, 94, 16, 5.1, 9.2
FROM properties
WHERE reference = 'YM-RN09';

INSERT OR IGNORE INTO network_sites (
  agency_id,
  site_type,
  workstations_count,
  printers_count,
  vpn_enabled,
  notes
)
SELECT id, 'Siege', 30, 1, 1, 'Serveurs AD, base de donnees, web, fichiers et sauvegardes.'
FROM agencies
WHERE name = 'Siege Aix';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Paris Centre';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Lyon Presqu ile';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Marseille Vieux Port';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Lille Centre';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Bordeaux Chartrons';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Nantes Erdre';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Toulouse Capitole';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Nice Massena';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Strasbourg Europe';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Montpellier Ecusson';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Rennes Gare';

INSERT OR IGNORE INTO network_sites (
  agency_id, site_type, workstations_count, printers_count, vpn_enabled, notes
)
SELECT id, 'Agence', 5, 1, 1, 'Agence commerciale reliee au siege par VPN IPSec.'
FROM agencies
WHERE name = 'Agence Grenoble Bastille';

INSERT OR IGNORE INTO sales_history (
  property_type,
  city,
  sale_price,
  surface_m2,
  sold_at,
  agency_id
) VALUES (
  'Appartement',
  'Rennes',
  284000,
  58,
  '2026-04-08',
  (SELECT id FROM agencies WHERE name = 'Agence Rennes Gare')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Appartement',
  'Lyon',
  429000,
  87,
  '2026-03-29',
  (SELECT id FROM agencies WHERE name = 'Agence Lyon Presqu ile')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Maison',
  'Marseille',
  521000,
  117,
  '2026-03-15',
  (SELECT id FROM agencies WHERE name = 'Agence Marseille Vieux Port')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Local professionnel',
  'Nantes',
  1095000,
  340,
  '2026-02-28',
  (SELECT id FROM agencies WHERE name = 'Agence Nantes Erdre')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Maison',
  'Bordeaux',
  598000,
  136,
  '2026-02-14',
  (SELECT id FROM agencies WHERE name = 'Agence Bordeaux Chartrons')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Appartement',
  'Paris',
  804000,
  72,
  '2026-01-30',
  (SELECT id FROM agencies WHERE name = 'Agence Paris Centre')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Appartement',
  'Aix-en-Provence',
  376000,
  68,
  '2026-01-15',
  (SELECT id FROM agencies WHERE name = 'Siege Aix')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Local professionnel',
  'Toulouse',
  741000,
  205,
  '2025-12-22',
  (SELECT id FROM agencies WHERE name = 'Agence Toulouse Capitole')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Appartement',
  'Nice',
  512000,
  66,
  '2025-12-02',
  (SELECT id FROM agencies WHERE name = 'Agence Nice Massena')
);

INSERT OR IGNORE INTO sales_history (
  property_type, city, sale_price, surface_m2, sold_at, agency_id
) VALUES (
  'Maison',
  'Montpellier',
  467000,
  109,
  '2025-11-18',
  (SELECT id FROM agencies WHERE name = 'Agence Montpellier Ecusson')
);

INSERT INTO contact_requests (
  property_id,
  full_name,
  email,
  phone,
  preferred_contact,
  message,
  status,
  created_at
)
SELECT
  (SELECT id FROM properties WHERE reference = 'YM-RN09'),
  'Nina Bernard',
  'client.demo@ymmo.fr',
  '06 51 18 72 33',
  'Telephone',
  'Je souhaite organiser une visite et connaitre les charges.',
  'Planifie',
  '2026-04-27 10:15:00'
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_requests
  WHERE email = 'client.demo@ymmo.fr'
    AND full_name = 'Nina Bernard'
    AND created_at = '2026-04-27 10:15:00'
);

INSERT INTO contact_requests (
  property_id,
  full_name,
  email,
  phone,
  preferred_contact,
  message,
  status,
  created_at
)
SELECT
  (SELECT id FROM properties WHERE reference = 'YM-LY07'),
  'Paul Garnier',
  'paul.garnier@email.fr',
  '06 88 14 12 99',
  'Email',
  'Budget valide, besoin d une seconde visite cette semaine.',
  'Nouveau',
  '2026-04-27 14:40:00'
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_requests
  WHERE email = 'paul.garnier@email.fr'
    AND full_name = 'Paul Garnier'
    AND created_at = '2026-04-27 14:40:00'
);

INSERT INTO contact_requests (
  property_id,
  full_name,
  email,
  phone,
  preferred_contact,
  message,
  status,
  created_at
)
SELECT
  (SELECT id FROM properties WHERE reference = 'YM-BX15'),
  'Sofia Martin',
  'sofia.martin@email.fr',
  '07 64 22 10 45',
  'Visio',
  'Demande de simulation d achat locatif avec rendement attendu.',
  'Relance',
  '2026-04-26 09:05:00'
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_requests
  WHERE email = 'sofia.martin@email.fr'
    AND full_name = 'Sofia Martin'
    AND created_at = '2026-04-26 09:05:00'
);

INSERT INTO contact_requests (
  property_id,
  full_name,
  email,
  phone,
  preferred_contact,
  message,
  status,
  created_at
)
SELECT
  (SELECT id FROM properties WHERE reference = 'YM-NA04'),
  'Julien Mercier',
  'julien.mercier@startup.fr',
  '06 14 19 30 87',
  'Telephone',
  'Besoin d un point rapide sur les surfaces et le stationnement.',
  'Nouveau',
  '2026-04-25 16:20:00'
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_requests
  WHERE email = 'julien.mercier@startup.fr'
    AND full_name = 'Julien Mercier'
    AND created_at = '2026-04-25 16:20:00'
);

INSERT INTO contact_requests (
  property_id,
  full_name,
  email,
  phone,
  preferred_contact,
  message,
  status,
  created_at
)
SELECT
  (SELECT id FROM properties WHERE reference = 'YM-AX12'),
  'Claire Bernard',
  'claire.bernard@email.fr',
  '06 73 52 18 41',
  'Email',
  'Interessee par une visite le samedi et par les informations scolaires du quartier.',
  'Qualifie',
  '2026-04-24 11:35:00'
WHERE NOT EXISTS (
  SELECT 1
  FROM contact_requests
  WHERE email = 'claire.bernard@email.fr'
    AND full_name = 'Claire Bernard'
    AND created_at = '2026-04-24 11:35:00'
);
