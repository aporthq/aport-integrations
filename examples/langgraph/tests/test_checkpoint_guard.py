import pytest

from checkpoint_guard import CheckpointDeniedError, LangGraphCheckpointGuard


def allow(_):
    return {'allowed': True}


def deny(_):
    return {'allowed': False, 'reason': 'denied'}


def actor_getter(state, next_node):
    return state.get('actor_id', 'agent:x')


def test_transition_allowed():
    g = LangGraphCheckpointGuard(allow, actor_id_getter=actor_getter)
    g.guard({'actor_id': 'agent:ok'}, 'node_a')


def test_transition_denied():
    g = LangGraphCheckpointGuard(deny, actor_id_getter=actor_getter)
    with pytest.raises(CheckpointDeniedError):
        g.guard({'actor_id': 'agent:no'}, 'node_b')
