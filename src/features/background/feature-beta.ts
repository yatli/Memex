export type UserBetaFeatureId = 'reader' | 'copy-paster'

export interface UserBetaFeature {
    id: UserBetaFeatureId
    name: string
    description: string
    link: string
    enabled: boolean // (by default)
}
const allFeatures: UserBetaFeature[] = [
    {
        id: 'reader',
        name: 'Reader View',
        description: '...',
        link: '...',
        enabled: false,
    },
    {
        id: 'copy-paster',
        name: 'Copy Paster',
        description: '...',
        link: '...',
        enabled: false,
    },
]

export type UserBetaFeatureMap = {
    [key in UserBetaFeatureId]: boolean
}
export interface FeaturesBetaInterface {
    getFeatures(): Promise<UserBetaFeature[]>
    toggleFeature(feature: UserBetaFeatureId): void
    getFeatureState(feature: UserBetaFeatureId): Promise<boolean>
}

export class FeaturesBeta implements FeaturesBetaInterface {
    private keyPrefix = 'BetaFeature_'

    public getFeatures = async (): Promise<UserBetaFeature[]> => {
        const allFeatureOptions = allFeatures
        for (const feature of allFeatures) {
            feature.enabled = await this.getFeatureState(feature.id)
        }
        return allFeatureOptions
    }

    public getFeatureState = async (
        featureId: UserBetaFeatureId,
    ): Promise<boolean> => {
        const val = localStorage.getItem(`${this.keyPrefix}${featureId}`)
        if (val !== null) {
            // If the user has saved a value, use that
            return JSON.parse(val)
        } else {
            // Otherwise use a static default
            return allFeatures.find((feature) => feature.id === featureId)
                .enabled
        }
    }

    public toggleFeature = async (featureId: UserBetaFeatureId) => {
        const val = await this.getFeatureState(featureId)
        localStorage.setItem(
            `${this.keyPrefix}${featureId}`,
            JSON.stringify(!val),
        )
    }
}
