type EventName =
  | 'app_open'
  | 'tab_switch'
  | 'food_add_text'
  | 'food_add_photo'
  | 'food_confirm'
  | 'food_delete'
  | 'recipe_generate'
  | 'mealplan_generate'
  | 'ai_chat_send'
  | 'deep_consult_start'
  | 'water_add'
  | 'weight_log'
  | 'share_card'
  | 'voice_input';

interface EventProps {
  [key: string]: string | number | boolean;
}

class Analytics {
  private queue: { event: EventName; props: EventProps; ts: number }[] = [];
  private userId: string = '';

  setUser(id: string) {
    this.userId = id;
  }

  track(event: EventName, props?: EventProps) {
    const entry = {
      event,
      props: { ...props, user_id: this.userId },
      ts: Date.now(),
    };
    this.queue.push(entry);
    console.log('[analytics]', event, props);

    // Batch send every 10 events
    if (this.queue.length >= 10) {
      this.flush();
    }
  }

  flush() {
    if (!this.queue.length) return;
    // Future: send to analytics backend
    // For now, just log
    const batch = [...this.queue];
    this.queue = [];
    console.log(`[analytics] Flushed ${batch.length} events`);
  }
}

export const analytics = new Analytics();
