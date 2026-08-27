import type { HazardData } from './db.js';

export interface AlertNotification {
  hazardId: number;
  type: string;
  description: string;
  distanceMeters: number;
  level: 'danger' | 'warning' | 'info';
  badge: string;
  title: string;
  message: string;
  advice: string;
  voiceText: string;
  imageUrl?: string | null | undefined;
}

export interface LocationTriggerRequest {
  lat: number;
  lng: number;
  alertRadius?: number | undefined;
  deviceId?: string | undefined;
}

export interface LocationTriggerResponse {
  timestamp: string;
  currentLocation: {
    lat: number;
    lng: number;
  };
  alertRadiusMeters: number;
  hasAlert: boolean;
  alertCount: number;
  alerts: AlertNotification[];
  highestLevel: 'danger' | 'warning' | 'info' | 'none';
}

/**
 * 子供向けに分かりやすい親しみやすいアラート文とアドバイスを生成
 */
export function buildChildFriendlyAlert(hazard: HazardData, distanceMeters: number): AlertNotification {
  const dist = Math.round(distanceMeters);

  let level: 'danger' | 'warning' | 'info' = 'info';
  let badge = 'ℹ️ まもなく';
  if (dist <= 20) {
    level = 'danger';
    badge = '🚨 すぐちかく！';
  } else if (dist <= 50) {
    level = 'warning';
    badge = '⚠️ ちかづいているよ';
  }

  let title = 'きをつけてね！🐾';
  let message = `${dist}m さきに あぶない ばしょがあるよ。`;
  let advice = 'まわりを よく みて あるこう！';
  let voiceText = `ちかくに あぶない ばしょがあるよ。きをつけてね。`;

  switch (hazard.type) {
    case 'Traffic':
      title = 'くるまに ちゅうい！🚗';
      message = `${dist}m さきに くるまが おおい ばしょがあるよ。`;
      advice = 'みぎ・ひだりを よく みて、とびだしは ぜったいに しないでね！';
      voiceText = `くるまに ちゅうい！${dist}メートル さきに くるまが おおい ばしょがあるよ。`;
      break;

    case 'Crime':
      title = 'ぼうはんに ちゅうい！👮';
      message = `${dist}m さきで ふしんしゃの ほうこくがあったよ。`;
      advice = 'こまったときは、おおごえを だすか「こども110ばんのいえ」に たすけを もとめよう！';
      voiceText = `ぼうはんに ちゅうい！こまったら すぐに おとなに たすけを もとめてね。`;
      break;

    case 'Lighting':
      title = 'あしもとに ちゅうい！🌙';
      message = `${dist}m さきは くらい みちだよ。`;
      advice = 'あしもとに きをつけて、なるべく あかるい みちを えらんで とおろう！';
      voiceText = `みちが くらいよ。あしもとに きをつけてね。`;
      break;

    case 'Disaster':
      title = 'あぶない ばしょ！🌊';
      message = `${dist}m さきに きけんな ばしょがあるよ。`;
      advice = 'かわ や がけ、ブロックべい には ちかづかないようにしよう！';
      voiceText = `きけんな ばしょが ちかくに あるよ。ちかづかないでね。`;
      break;

    default:
      title = 'きをつけてね！🐾';
      message = `${dist}m さきに「${hazard.description || 'ちゅういする ばしょ'}」があるよ。`;
      advice = 'まわりを よく かくにん して あるこう！';
      voiceText = `きをつけてね！${dist}メートル さきに ちゅういする ばしょがあるよ。`;
      break;
  }

  return {
    hazardId: hazard.id,
    type: hazard.type,
    description: hazard.description,
    distanceMeters,
    level,
    badge,
    title,
    message,
    advice,
    voiceText,
    imageUrl: hazard.imageUrl
  };
}
