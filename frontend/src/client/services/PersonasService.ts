/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MergePersonaRequest } from '../models/MergePersonaRequest';
import type { Persona } from '../models/Persona';
import type { PersonaRead } from '../models/PersonaRead';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PersonasService {
    /**
     * List Personas
     * @param campaignId
     * @returns Persona Successful Response
     * @throws ApiError
     */
    public static listPersonasPersonasGet(
        campaignId?: number,
    ): CancelablePromise<Array<Persona>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/personas/',
            query: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Persona
     * @param requestBody
     * @returns PersonaRead Successful Response
     * @throws ApiError
     */
    public static createPersonaPersonasPost(
        requestBody: Persona,
    ): CancelablePromise<PersonaRead> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/personas/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Persona
     * @param personaId
     * @returns PersonaRead Successful Response
     * @throws ApiError
     */
    public static getPersonaPersonasPersonaIdGet(
        personaId: number,
    ): CancelablePromise<PersonaRead> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/personas/{persona_id}',
            path: {
                'persona_id': personaId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Persona
     * @param personaId
     * @param requestBody
     * @returns PersonaRead Successful Response
     * @throws ApiError
     */
    public static updatePersonaPersonasPersonaIdPut(
        personaId: number,
        requestBody: Persona,
    ): CancelablePromise<PersonaRead> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/personas/{persona_id}',
            path: {
                'persona_id': personaId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Persona
     * @param personaId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deletePersonaPersonasPersonaIdDelete(
        personaId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/personas/{persona_id}',
            path: {
                'persona_id': personaId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Merge Personas
     * @param requestBody
     * @returns Persona Successful Response
     * @throws ApiError
     */
    public static mergePersonasPersonasMergePost(
        requestBody: MergePersonaRequest,
    ): CancelablePromise<Persona> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/personas/merge',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
