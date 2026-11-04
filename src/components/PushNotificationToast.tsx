import React from 'react';
import { PushNotification } from '../types';
import { Bell, DollarSign, ShieldAlert, X, Zap } from 'lucide-react';

interface PushNotificationToastProps {
  notification: PushNotification | null;
  onDismiss: () => void;
  isOpenCenter: boolean;
  onCloseCenter: () => void;
  notificationsList: PushNotification[];
  onMarkAllAsRead: () => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({
  notification,
  onDismiss,
  isOpenCenter,
  onCloseCenter,
  notificationsList,
  onMarkAllAsRead,
}) => {
  return (
    <>
      {/* Floating Push Toast in White */}
      {notification && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] sm:w-full bg-white border-2 border-amber-500 rounded-3xl p-4 shadow-2xl flex items-start justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0 mt-0.5 shadow-md">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h5 className="font-heading font-black text-slate-950 text-sm sm:text-base">
                {notification.title}
              </h5>
              <p className="text-xs sm:text-sm text-slate-700 mt-0.5 leading-snug font-medium">
                {notification.message}
              </p>
              <span className="text-xs text-amber-800 font-mono font-bold mt-1.5 block">
                {notification.time} • Notificação Push Instantânea
              </span>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-800 p-1 cursor-pointer shrink-0 text-base font-bold"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Full Notifications Drawer in White */}
      {isOpenCenter && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 max-w-lg w-full rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5">
              <div className="flex items-center gap-2.5">
                <Bell className="w-6 h-6 text-amber-600" />
                <h3 className="font-heading font-black text-slate-950 text-xl">
                  Central de Notificações Push
                </h3>
              </div>
              <button
                onClick={onCloseCenter}
                className="text-slate-400 hover:text-slate-800 text-xl font-black p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {notificationsList.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-start gap-3.5 text-sm"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold mt-0.5 border border-amber-300">
                    {item.type === 'financial' ? (
                      <DollarSign className="w-5 h-5 text-emerald-700" />
                    ) : item.type === 'safety' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600" />
                    ) : (
                      <Zap className="w-5 h-5 text-amber-700" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-black text-slate-950 text-sm sm:text-base">{item.title}</h5>
                    <p className="text-slate-700 text-xs sm:text-sm mt-1 font-medium">{item.message}</p>
                    <span className="text-xs text-slate-500 font-mono font-bold mt-1.5 block">
                      {item.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                onMarkAllAsRead();
                onCloseCenter();
              }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm py-3.5 rounded-xl transition-all cursor-pointer border border-slate-300"
            >
              Marcar Todas como Lidas
            </button>
          </div>
        </div>
      )}
    </>
  );
};
