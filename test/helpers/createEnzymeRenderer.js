import { shallow } from 'enzyme';

const renderer = {}
renderer.render = shallow;

module.exports = renderer;
