/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Session } from '../models/Session';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SessionsService {
    /**
     * List Sessions
     * @param campaignId
     * @returns Session Successful Response
     * @throws ApiError
     */
    public static listSessionsSessionsGet(
        campaignId?: number,
    ): CancelablePromise<Array<Session>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sessions/',
            query: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Create Session
     * @param requestBody
     * @returns Session Successful Response
     * @throws ApiError
     */
    public static createSessionSessionsPost(
        requestBody: Session,
    ): CancelablePromise<Session> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/sessions/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Session Details
     * @param sessionId
     * @returns Session Successful Response
     * @throws ApiError
     */
    public static getSessionDetailsSessionsSessionIdGet(
        sessionId: number,
    ): CancelablePromise<Session> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Session
     * @param sessionId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteSessionSessionsSessionIdDelete(
        sessionId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Session
     * @param sessionId
     * @param requestBody
     * @returns Session Successful Response
     * @throws ApiError
     */
    public static updateSessionSessionsSessionIdPut(
        sessionId: number,
        requestBody: Session,
    ): CancelablePromise<Session> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/sessions/{session_id}',
            path: {
                'session_id': sessionId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Regenerate Session
     * @param sessionId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static regenerateSessionSessionsSessionIdRegeneratePost(
        sessionId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/sessions/{session_id}/regenerate',
            path: {
                'session_id': sessionId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
