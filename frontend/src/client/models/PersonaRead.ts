/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { HighlightRead } from './HighlightRead';
import type { QuoteRead } from './QuoteRead';
export type PersonaRead = {
    name: string;
    role: string;
    description: string;
    voice_description?: (string | null);
    gender?: (string | null);
    race?: (string | null);
    /**
     * Character class (e.g., Wizard, Fighter)
     */
    class_name?: (string | null);
    alignment?: (string | null);
    level?: (number | null);
    /**
     * Alive, Dead, Missing, etc.
     */
    status?: string;
    faction?: (string | null);
    /**
     * Name of the player running this character (if PC)
     */
    player_name?: (string | null);
    campaign_id: number;
    session_id?: (number | null);
    summary?: (string | null);
    id: number;
    highlights?: Array<HighlightRead>;
    quotes?: Array<QuoteRead>;
};

