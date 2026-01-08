/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DefaultService {
    /**
     * Handle Http Get
     * @returns any The GraphiQL integrated development environment.
     * @throws ApiError
     */
    public static handleHttpGetGraphqlGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/graphql',
            errors: {
                404: `Not found if GraphiQL or query via GET are not enabled.`,
            },
        });
    }
    /**
     * Handle Http Post
     * @returns any Successful Response
     * @throws ApiError
     */
    public static handleHttpPostGraphqlPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/graphql',
        });
    }
    /**
     * Read Root
     * @returns any Successful Response
     * @throws ApiError
     */
    public static readRootGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/',
        });
    }
}
