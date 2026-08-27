-- Auto-generated PostGIS ETL Import Script

-- Source: tendo_hazards.geojson


INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-001',
  'Disaster',
  '倉津川周辺 浸水想定エリア',
  '天童市',
  '本町・老野森',
  3,
  '大雨のときに 倉津川（くらつがわ）があふれる おそれがある ばしょです。かわの ちかくに ちかづかないでね！',
  '天童市洪水避難地図（オープンデータ）',
  38.356,
  140.371,
  ST_SetSRID(ST_MakePoint(140.371, 38.356), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-002',
  'Disaster',
  '乱川周辺 浸水想定エリア',
  '天童市',
  '乱川',
  4,
  'たいふうや 大雨で 乱川（みだれがわ）の すいいが あがる おそれがあります。あめが つよい ときは ちかづかないでね！',
  '天童市洪水避難地図（オープンデータ）',
  38.385,
  140.38,
  ST_SetSRID(ST_MakePoint(140.38, 38.385), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-003',
  'Disaster',
  '舞鶴山周辺 土砂災害警戒区域',
  '天童市',
  '天童',
  4,
  '舞鶴山（まいづるやま）の すそのです。大雨の あとは がけくずれに ちゅういしてね！',
  '山形県 土砂災害警戒区域オープンデータ',
  38.3512,
  140.3755,
  ST_SetSRID(ST_MakePoint(140.3755, 38.3512), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-004',
  'Disaster',
  '貫津地区 土砂災害危険箇所',
  '天童市',
  '貫津',
  3,
  '貫津（ぬかづ）地区の やまぎわです。じしんや 大雨の あとは やまくずれに ちゅういしてね！',
  '山形県 土砂災害警戒区域オープンデータ',
  38.342,
  140.395,
  ST_SetSRID(ST_MakePoint(140.395, 38.342), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-005',
  'Disaster',
  '山口地区 山くずれ警戒エリア',
  '天童市',
  '山口',
  5,
  '山口（やまぐち）地区の がけの ちかくです。あめが ふったら はやく はなれようね！',
  '山形県 土砂災害警戒区域オープンデータ',
  38.368,
  140.42,
  ST_SetSRID(ST_MakePoint(140.42, 38.368), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-006',
  'Disaster',
  '押切川周辺 浸水想定エリア',
  '天童市',
  '長岡',
  3,
  '長岡（ながおか）地区を ながれる 押切川（おしきりがわ）の ちかくです。大雨の ときは ちかづかないでね！',
  '天童市洪水避難地図（オープンデータ）',
  38.338,
  140.365,
  ST_SetSRID(ST_MakePoint(140.365, 38.338), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-DIS-007',
  'Disaster',
  '立谷川周辺 浸水想定エリア',
  '天童市',
  '荒谷',
  3,
  '荒谷（あらや）地区を ながれる 立谷川（たちやがわ）周辺です。川の すいいに ちゅういしようね！',
  '天童市洪水避難地図（オープンデータ）',
  38.322,
  140.382,
  ST_SetSRID(ST_MakePoint(140.382, 38.322), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-SLT-001',
  'Shelter',
  '天童市立中部小学校（避難所）',
  '天童市',
  '老野森2-6-4',
  1,
  '【天童市指定避難所】老野森にある 小学校です。大雨や 地震の ときに にげる 安全な ばしょだよ！',
  '天童市指定緊急避難場所一覧オープンデータ',
  38.3591,
  140.3742,
  ST_SetSRID(ST_MakePoint(140.3742, 38.3591), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-SLT-002',
  'Shelter',
  '天童市立南部小学校（避難所）',
  '天童市',
  '田鶴町4-2-10',
  1,
  '【天童市指定避難所】田鶴町にある 小学校です。いざというときに つかえる 安全な ひなんじょだよ！',
  '天童市指定緊急避難場所一覧オープンデータ',
  38.344,
  140.3768,
  ST_SetSRID(ST_MakePoint(140.3768, 38.344), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-SLT-003',
  'Shelter',
  '天童市立北部小学校（避難所）',
  '天童市',
  '乱川4-2-25',
  1,
  '【天童市指定避難所】乱川にある 小学校です。北エリアの ひなんじょだよ！',
  '天童市指定緊急避難場所一覧オープンデータ',
  38.3772,
  140.3731,
  ST_SetSRID(ST_MakePoint(140.3731, 38.3772), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-SLT-004',
  'Shelter',
  '天童市立第一中学校（避難所）',
  '天童市',
  '原町10-1',
  1,
  '【天童市指定避難所】原町にある 中学校です。広い 体育館が ひなんじょになります！',
  '天童市指定緊急避難場所一覧オープンデータ',
  38.3512,
  140.362,
  ST_SetSRID(ST_MakePoint(140.362, 38.3512), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-SLT-005',
  'Shelter',
  '天童市立長岡小学校（避難所）',
  '天童市',
  '東長岡3-3-1',
  1,
  '【天童市指定避難所】長岡地区の ひなんじょです。家族で にげる ばしょを たしかめておこう！',
  '天童市指定緊急避難場所一覧オープンデータ',
  38.337,
  140.3665,
  ST_SetSRID(ST_MakePoint(140.3665, 38.337), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-SLT-006',
  'Shelter',
  '天童市立山口小学校（避難所）',
  '天童市',
  '山口1919',
  1,
  '【天童市指定避難所】山口地区の 小学校です。東部の 山あいの 地域の 安全な ばしょだよ！',
  '天童市指定緊急避難場所一覧オープンデータ',
  38.3695,
  140.419,
  ST_SetSRID(ST_MakePoint(140.419, 38.3695), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-CRM-001',
  'Crime',
  '天童警察署',
  '天童市',
  '糠塚2-4-1',
  1,
  '【警察署】天童市の 中心にある 警察署です。困ったことがあったら お巡りさんに 相談しよう！',
  '山形県警察 警察署・交番所在地オープンデータ',
  38.3582,
  140.3705,
  ST_SetSRID(ST_MakePoint(140.3705, 38.3582), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-CRM-002',
  'Crime',
  '天童西部交番',
  '天童市',
  '交り江4-6-23',
  1,
  '【交番】西エリアの 交番です。不審者（ふしんしゃ）を見かけたら すぐに 知らせようね！',
  '山形県警察 警察署・交番所在地オープンデータ',
  38.3565,
  140.355,
  ST_SetSRID(ST_MakePoint(140.355, 38.3565), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-CRM-003',
  'Crime',
  '天童南駅前交番',
  '天童市',
  '芳賀タウン北6-3-6',
  1,
  '【交番】天童南駅や イオンモールの 近くにある 交番です。助けを もとめられる 安心な 場所だよ！',
  '山形県警察 警察署・交番所在地オープンデータ',
  38.334,
  140.369,
  ST_SetSRID(ST_MakePoint(140.369, 38.334), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-CRM-004',
  'Crime',
  '山形県警察 山口駐在所',
  '天童市',
  '山口1544-11',
  1,
  '【駐在所】山口地区を まもる 駐在所です。地域を 見守ってくれています！',
  '山形県警察 警察署・交番所在地オープンデータ',
  38.371,
  140.418,
  ST_SetSRID(ST_MakePoint(140.418, 38.371), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-TRF-001',
  'Traffic',
  '国道13号 天童バイパス交差点',
  '天童市',
  '鍬ノ町',
  4,
  '国道13号線は くるまが とても はやいスピードで とおります。みぎひだりを よく みて わたろうね！',
  '山形県警察 交通事故オープンデータ',
  38.3585,
  140.3605,
  ST_SetSRID(ST_MakePoint(140.3605, 38.3585), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-TRF-002',
  'Traffic',
  '国道48号線・乱川交差点',
  '天童市',
  '乱川',
  4,
  'おおきい トラックや くるまが たくさん とおる こうじてんです。しんごうを しっかり まもろうね！',
  '山形県警察 交通事故オープンデータ',
  38.375,
  140.37,
  ST_SetSRID(ST_MakePoint(140.37, 38.375), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-TRF-003',
  'Traffic',
  '天童駅前通り 交差点',
  '天童市',
  '駅西',
  3,
  'えきまえの みちは 朝と 夕方に くるまや バイクが おおくなります。とびだしは ぜったいに やめようね！',
  '天童市通学路交通安全プログラム',
  38.3605,
  140.367,
  ST_SetSRID(ST_MakePoint(140.367, 38.3605), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();

INSERT INTO hazards (external_id, type, name, city, district, hazard_level, description, source, lat, lng, location)
VALUES (
  'TENDO-TRF-004',
  'Traffic',
  '天童南駅前・イオンモール周辺交差点',
  '天童市',
  '芳賀タウン',
  3,
  '大型商業施設や 駅の 近くで 車が たくさん 行き交います。横断歩道を 渡るときは しっかり 確認しようね！',
  '山形県警察 交通事故オープンデータ',
  38.333,
  140.3685,
  ST_SetSRID(ST_MakePoint(140.3685, 38.333), 4326)
)
ON CONFLICT (external_id) DO UPDATE SET
  type = EXCLUDED.type,
  name = EXCLUDED.name,
  district = EXCLUDED.district,
  hazard_level = EXCLUDED.hazard_level,
  description = EXCLUDED.description,
  source = EXCLUDED.source,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  location = EXCLUDED.location,
  updated_at = NOW();