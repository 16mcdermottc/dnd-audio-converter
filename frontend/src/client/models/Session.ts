/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ProcessingStatus } from './ProcessingStatus';
export type Session = {
    id?: (number | null);
    campaign_id: number;
    name: string;
    created_at?: string;
    /**
     * JSON list of file paths
     */
    audio_file_paths?: (string | null);
    status?: ProcessingStatus;
    /**
     * AI generated summary of the session
     */
    summary?: (string | null);
};

