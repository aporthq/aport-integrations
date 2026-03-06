from checkpoint_guard import LangGraphCheckpointGuard


def mock_verify(payload):
    # block dangerous transition for demo
    if payload['resource'].endswith(':delete_wallet'):
        return {'allowed': False, 'reason': 'high-risk transition blocked'}
    return {'allowed': True}


def actor_getter(state, next_node):
    return state.get('actor_id', 'agent:unknown')


guard = LangGraphCheckpointGuard(mock_verify, actor_id_getter=actor_getter)

state = {'actor_id': 'agent:trusted', 'balance': 100}

guard.guard(state, 'review_order')
print('review_order allowed')

try:
    guard.guard(state, 'delete_wallet')
except Exception as e:
    print('delete_wallet denied:', e)
