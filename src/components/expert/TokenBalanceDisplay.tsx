/**
 * 🪙 TOKEN BALANCE DISPLAY
 * Shows VEILO token balance with Hedera verification
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Coins, ExternalLink, RefreshCw } from 'lucide-react';
import { hederaTokenService } from '@/services/hederaTokenService';
import { HEDERA_CONFIG } from '@/config/hedera';
import { toast } from 'sonner';

interface TokenBalanceDisplayProps {
  accountId: string;
  showFullHistory?: boolean;
}

export function TokenBalanceDisplay({ 
  accountId, 
  showFullHistory = false 
}: TokenBalanceDisplayProps) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    setRefreshing(true);
    const result = await hederaTokenService.getVeiloBalance(accountId);
    
    if (result.success && result.balance !== undefined) {
      setBalance(result.balance);
    } else {
      toast.error('Failed to fetch token balance');
    }
    
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (accountId) {
      fetchBalance();
    }
  }, [accountId]);

  const handleRefresh = () => {
    fetchBalance();
    toast.success('Balance refreshed');
  };

  const openExplorer = () => {
    // This will be updated once token is created on backend
    window.open(`${HEDERA_CONFIG.EXPLORER_URL}/account/${accountId}`, '_blank');
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Loading Balance...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            VEILO Token Balance
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Balance Display */}
        <div className="text-center p-6 bg-background/50 rounded-lg">
          <div className="text-4xl font-bold text-primary">
            {balance.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {HEDERA_CONFIG.VEILO_TOKEN.SYMBOL}
          </div>
        </div>

        {/* Blockchain Verification */}
        <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
              Verified on Hedera
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={openExplorer}
            className="gap-2"
          >
            View on HashScan
            <ExternalLink className="w-3 h-3" />
          </Button>
        </div>

        {/* Account Info */}
        <div className="text-xs text-muted-foreground text-center">
          Account: {accountId}
        </div>

        {/* Coming Soon Features */}
        {showFullHistory && (
          <div className="pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground text-center">
              Transaction history coming soon
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
