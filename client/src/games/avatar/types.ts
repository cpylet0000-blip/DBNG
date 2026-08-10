/**
 * TypeScript types for Avatar customization
 * Defines interfaces for avatar appearance and customization options
 */

export interface AvatarAppearance {
  skinColor: string
  hairStyle: string
  hairColor: string
  eyeColor: string
  outfit: string
}

export interface AvatarCustomization {
  userId: number
  appearance: AvatarAppearance
  displayName: string
  bio?: string
  level: number
  xp: number
}

export interface AvatarPreset {
  id: string
  name: string
  appearance: AvatarAppearance
  thumbnail: string
}
