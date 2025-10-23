/**
 * 🔐 HEDERA VERIFICATION BADGE
 * Displays blockchain verification status for experts
 */

import { useState } from 'react';
import { Shield, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { hederaService } from '@/services/hederaService';
import { useToast } from '@/hooks/use-toast';

interface HederaVerificationBadgeProps {
  expertId: string;
  hederaTopicId?: string;
  isVerified?: boolean;
  className?: string;
  compact?: boolean;
}

export const HederaVerificationBadge = ({
  expertId,
  hederaTopicId,
  isVerified = false,
  className = '',
  compact = false,
}: HederaVerificationBadgeProps) => {
  const [verifying, setVerifying] = useState(false);
  const [credentialData, setCredentialData] = useState<any>(null);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (!hederaTopicId) {
      toast({
        title: 'No blockchain record',
        description: 'This expert has not been verified on Hedera yet.',
        variant: 'destructive',
      });
      return;
    }

    setVerifying(true);

    try {
      const result = await hederaService.verifyExpertCredentials(hederaTopicId);

      if (result.success && result.credential) {
        setCredentialData(result.credential);
        toast({
          title: 'Verification successful',
          description: 'Expert credentials verified on Hedera blockchain',
        });
      } else {
        toast({
          title: 'Verification failed',
          description: result.error || 'Could not verify credentials',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to connect to Hedera network',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (!isVerified && !hederaTopicId) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Badge
          variant={isVerified ? 'default' : 'secondary'}
          className={`cursor-pointer hover:opacity-80 transition-opacity ${compact ? 'text-xs px-2 py-0.5' : ''} ${className}`}
        >
          <Shield className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
          {compact ? (isVerified ? '⛓️' : '🔗') : (isVerified ? 'Hedera Verified' : 'Verify Credentials')}
        </Badge>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Blockchain Verification
          </DialogTitle>
          <DialogDescription>
            This expert's credentials are verified on the Hedera blockchain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Verification Status */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              {isVerified ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">
                  {isVerified ? 'Verified Professional' : 'Pending Verification'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Credentials stored on Hedera Consensus Service
                </p>
              </div>
            </div>
          </div>

          {/* Credential Data */}
          {credentialData && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Expert ID</span>
                <span className="font-mono text-xs">{credentialData.expertId}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Specialization</span>
                <span>{credentialData.specialization}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Institution</span>
                <span>{credentialData.institution}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Verified At</span>
                <span className="text-xs">
                  {new Date(credentialData.verifiedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          )}

          {/* Hedera Topic Link */}
          {hederaTopicId && (
            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Hedera Topic ID</p>
                <p className="font-mono text-xs truncate">{hederaTopicId}</p>
              </div>
              <a
                href={hederaService.getExplorerUrl('topic', hederaTopicId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            disabled={verifying || !hederaTopicId}
            className="w-full"
            variant="outline"
          >
            {verifying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying on Hedera...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Verify on Blockchain
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Verification is done via Hedera Mirror Node and is completely transparent
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
