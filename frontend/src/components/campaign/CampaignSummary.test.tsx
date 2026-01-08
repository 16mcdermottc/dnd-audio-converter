import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import CampaignSummary from './CampaignSummary';
import { Campaign } from '../../types';

const mockCampaign: Campaign = {
    id: 1,
    name: 'Test Campaign',
    description: 'Test Desc',
    created_at: '2023-01-01',
    summary: 'A legendary tale.'
};

const queryClient = new QueryClient();

describe('CampaignSummary', () => {
    it('renders the summary text', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <CampaignSummary campaign={mockCampaign} />
            </QueryClientProvider>
        );
        expect(screen.getByText('The Legend So Far')).toBeInTheDocument();
        expect(screen.getByText('A legendary tale.')).toBeInTheDocument();
    });

    it('shows generate button', () => {
        render(
            <QueryClientProvider client={queryClient}>
                <CampaignSummary campaign={mockCampaign} />
            </QueryClientProvider>
        );
        expect(screen.getByRole('button', { name: /Regenerate Summary/i })).toBeInTheDocument();
    });
});
