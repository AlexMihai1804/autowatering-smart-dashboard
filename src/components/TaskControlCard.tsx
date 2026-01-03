import React, { useState } from 'react';
import { IonButton, IonIcon, IonSpinner, IonProgressBar } from '@ionic/react';
import { play, pause, stop, trash, flash, checkmarkCircle, alertCircle } from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { TaskStatus, TaskQueueCommand } from '../types/firmware_structs';
import { useI18n } from '../i18n';

interface TaskControlCardProps {
    onToast?: (message: string, color?: string) => void;
}

const TaskControlCard: React.FC<TaskControlCardProps> = ({ onToast }) => {
    const { currentTask, taskQueue, zones, connectionState } = useAppStore();
    const bleService = BleService.getInstance();
    const { t } = useI18n();
    
    const [loading, setLoading] = useState<string | null>(null);
    
    const isConnected = connectionState === 'connected';
    const isWatering = currentTask?.status === TaskStatus.RUNNING;
    const isPaused = currentTask?.status === TaskStatus.PAUSED;
    const isIdle = currentTask?.status === TaskStatus.IDLE || !currentTask;
    
    const activeZone = currentTask && currentTask.channel_id !== 0xFF 
        ? zones.find(z => z.channel_id === currentTask.channel_id)
        : null;
    
    const progress = currentTask && currentTask.target_value > 0
        ? (currentTask.current_value / currentTask.target_value) * 100
        : 0;
    const litersShort = t('common.litersShort');
    const mlShort = t('common.mlShort');
    const percentUnit = t('common.percent');

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatVolume = (ml: number): string => {
        if (ml >= 1000) {
            return `${(ml / 1000).toFixed(1)}${litersShort}`;
        }
        return `${ml}${mlShort}`;
    };

    const handleAction = async (actionKey: string, actionLabel: string, fn: () => Promise<void>) => {
        if (!isConnected) {
            onToast?.(t('errors.notConnected'), 'danger');
            return;
        }
        
        setLoading(actionKey);
        try {
            await fn();
            onToast?.(t('taskControl.commandSent').replace('{action}', actionLabel), 'success');
        } catch (error: any) {
            console.error(`Failed to ${actionKey}:`, error);
            onToast?.(t('errors.failedWithReason').replace('{error}', error.message), 'danger');
        } finally {
            setLoading(null);
        }
    };

    const handlePause = () => handleAction('pause', t('taskControl.actions.pause'), () => bleService.pauseCurrentWatering());
    const handleResume = () => handleAction('resume', t('taskControl.actions.resume'), () => bleService.resumeCurrentWatering());
    const handleStop = () => handleAction('stop', t('taskControl.actions.stop'), () => bleService.stopCurrentWatering());
    const handleStartNext = () => handleAction('start', t('taskControl.actions.startNext'), () => bleService.startNextTask());
    const handleClearQueue = () => handleAction('clear', t('taskControl.actions.clearQueue'), () => bleService.clearTaskQueue());

    if (!isConnected) {
        return null;
    }

    return (
        <div className="glass-card p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <IonIcon icon={flash} className="text-yellow-400" />
                    {t('taskControl.title')}
                </h2>
                {taskQueue && (
                    <span className="text-sm text-gray-400 font-mono">
                        {t('labels.queue')}: {t('taskControl.queueStatus').replace('{count}', String(taskQueue.pending_count))}
                    </span>
                )}
            </div>

            {/* Current Task Status */}
            {currentTask && currentTask.channel_id !== 0xFF ? (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${
                                isWatering ? 'bg-cyber-cyan animate-pulse' : 
                                isPaused ? 'bg-yellow-400' : 'bg-gray-500'
                            }`}></div>
                            <span className="text-white font-semibold">
                                {activeZone?.name || `${t('zones.zone')} ${currentTask.channel_id}`}
                            </span>
                        </div>
                        <span className={`text-sm px-2 py-1 rounded ${
                            isWatering ? 'bg-cyber-cyan/20 text-cyber-cyan' :
                            isPaused ? 'bg-yellow-400/20 text-yellow-400' :
                            'bg-gray-600/50 text-gray-400'
                        }`}>
                            {isWatering
                                ? t('taskControl.status.running')
                                : isPaused
                                    ? t('taskControl.status.paused')
                                    : t('taskControl.status.idle')}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                        <IonProgressBar 
                            value={progress / 100} 
                            color={isPaused ? 'warning' : 'primary'}
                            className="h-2 rounded-full"
                        />
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                            <div className="text-gray-400">{t('labels.progress')}</div>
                            <div className="text-white font-mono">{Math.round(progress)}{percentUnit}</div>
                        </div>
                        <div>
                            <div className="text-gray-400">
                                {currentTask.mode === 0 ? t('labels.time') : t('labels.volume')}
                            </div>
                            <div className="text-white font-mono">
                                {currentTask.mode === 0 
                                    ? formatTime(currentTask.current_value)
                                    : formatVolume(currentTask.current_value)
                                }
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-400">{t('labels.target')}</div>
                            <div className="text-white font-mono">
                                {currentTask.mode === 0 
                                    ? formatTime(currentTask.target_value)
                                    : formatVolume(currentTask.target_value)
                                }
                            </div>
                        </div>
                    </div>

                    {/* Total Volume (always shown) */}
                    {currentTask.total_volume > 0 && (
                        <div className="mt-2 text-center text-xs text-gray-500">
                            {t('taskControl.totalDispensed').replace('{volume}', formatVolume(currentTask.total_volume))}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4 text-center">
                    <IonIcon icon={checkmarkCircle} className="text-4xl text-gray-500 mb-2" />
                    <p className="text-gray-400">{t('taskControl.noActiveTask')}</p>
                    {taskQueue && taskQueue.pending_count > 0 && (
                        <p className="text-sm text-cyber-cyan mt-1">
                            {t('taskControl.tasksWaiting').replace('{count}', String(taskQueue.pending_count))}
                        </p>
                    )}
                </div>
            )}

            {/* Control Buttons */}
            <div className="grid grid-cols-2 gap-3">
                {/* Pause/Resume Button */}
                {isWatering && (
                    <IonButton
                        expand="block"
                        color="warning"
                        onClick={handlePause}
                        disabled={!!loading}
                    >
                        {loading === 'pause' ? <IonSpinner name="crescent" /> : (
                            <>
                                <IonIcon icon={pause} slot="start" />
                                {t('taskControl.actions.pause')}
                            </>
                        )}
                    </IonButton>
                )}
                
                {isPaused && (
                    <IonButton
                        expand="block"
                        color="success"
                        onClick={handleResume}
                        disabled={!!loading}
                    >
                        {loading === 'resume' ? <IonSpinner name="crescent" /> : (
                            <>
                                <IonIcon icon={play} slot="start" />
                                {t('taskControl.actions.resume')}
                            </>
                        )}
                    </IonButton>
                )}

                {/* Stop Button - visible when running or paused */}
                {(isWatering || isPaused) && (
                    <IonButton
                        expand="block"
                        color="danger"
                        onClick={handleStop}
                        disabled={!!loading}
                    >
                        {loading === 'stop' ? <IonSpinner name="crescent" /> : (
                            <>
                                <IonIcon icon={stop} slot="start" />
                                {t('taskControl.actions.stop')}
                            </>
                        )}
                    </IonButton>
                )}

                {/* Start Next - visible when idle and queue has tasks */}
                {isIdle && taskQueue && taskQueue.pending_count > 0 && (
                    <IonButton
                        expand="block"
                        color="success"
                        onClick={handleStartNext}
                        disabled={!!loading}
                    >
                        {loading === 'start' ? <IonSpinner name="crescent" /> : (
                            <>
                                <IonIcon icon={play} slot="start" />
                                {t('taskControl.actions.startNext')}
                            </>
                        )}
                    </IonButton>
                )}

                {/* Clear Queue - visible when queue has tasks and not running */}
                {isIdle && taskQueue && taskQueue.pending_count > 0 && (
                    <IonButton
                        expand="block"
                        color="medium"
                        onClick={handleClearQueue}
                        disabled={!!loading}
                    >
                        {loading === 'clear' ? <IonSpinner name="crescent" /> : (
                            <>
                                <IonIcon icon={trash} slot="start" />
                                {t('taskControl.actions.clearQueue')}
                            </>
                        )}
                    </IonButton>
                )}
            </div>

            {/* Queue Stats */}
            {taskQueue && (
                <div className="mt-4 pt-4 border-t border-gray-700 flex justify-between text-xs text-gray-500">
                    <span>{t('taskControl.completedToday').replace('{count}', String(taskQueue.completed_tasks))}</span>
                    <span>{t('taskControl.activeId').replace('{id}', String(taskQueue.active_task_id ?? t('labels.none')))}</span>
                </div>
            )}
        </div>
    );
};

export default TaskControlCard;
